import { spawn, ChildProcess } from "node:child_process";

// Persistent PowerShell worker. One long-lived process reads a command per line
// from stdin and writes one reply per line to stdout. This replaces per-poll
// `powershell.exe` spawns (~0.5s media / 4s system) with a single process.

const PRELUDE = `
$ErrorActionPreference='SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
try { [void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime] } catch {}
try { [void][Windows.Devices.Radios.Radio,Windows.Devices.Radios,ContentType=WindowsRuntime] } catch {}
try { [void][Windows.Devices.Enumeration.DeviceInformation,Windows.Devices.Enumeration,ContentType=WindowsRuntime] } catch {}
try { [void][Windows.Devices.Bluetooth.BluetoothDevice,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] } catch {}
try { [void][Windows.Devices.Bluetooth.GenericAttributeProfile.GattDeviceService,Windows.Devices.Bluetooth,ContentType=WindowsRuntime] } catch {}

function Await($op, $type){
  $method=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1
  return $method.MakeGenericMethod($type).Invoke($null,@($op)).GetAwaiter().GetResult()
}

# CoreAudio volume via inline C# (compiled once at startup, not every call).
try {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
  int GetDevice(string id, out IMMDevice device);
  int RegisterEndpointNotificationCallback(IntPtr client);
  int UnregisterEndpointNotificationCallback(IntPtr client);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object ep);
  int OpenPropertyStore(int access, out IntPtr store);
  int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
  int GetState(out int state);
}
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int RegisterControlChangeNotify(IntPtr n);
  int UnregisterControlChangeNotify(IntPtr n);
  int GetChannelCount(out uint count);
  int SetMasterVolumeLevel(float level, Guid ctx);
  int SetMasterVolumeLevelScalar(float level, Guid ctx);
  int GetMasterVolumeLevel(out float level);
  int GetMasterVolumeLevelScalar(out float level);
}
public class Audio {
  public static int Get() {
    var e = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
    IMMDevice d; e.GetDefaultAudioEndpoint(0, 1, out d);
    Guid iid = typeof(IAudioEndpointVolume).GUID;
    object o; d.Activate(ref iid, 1, IntPtr.Zero, out o);
    var v = (IAudioEndpointVolume)o;
    float l; v.GetMasterVolumeLevelScalar(out l);
    return (int)Math.Round(l * 100);
  }
}
'@
} catch {}

# Read one command per line (base64-encoded UTF-8 script), decode, evaluate,
# print a single-line reply. Base64 keeps multi-line scripts intact across the
# line-oriented stdin protocol.
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  try {
    $script = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($line))
    $out = & ([scriptblock]::Create($script))
    if ($out -eq $null) { $out = '' }
    [Console]::Out.WriteLine('@@BEGIN@@' + ($out | Out-String).Trim() + '@@END@@')
  } catch {
    [Console]::Out.WriteLine('@@BEGIN@@@@END@@')
  }
  [Console]::Out.Flush()
}
`;

interface Pending {
  resolve: (out: string) => void;
  timer: NodeJS.Timeout;
}

export class PsWorker {
  private proc: ChildProcess | null = null;
  private buf = "";
  private queue: Pending[] = [];
  private starting = false;
  private disposed = false;

  private spawnProc() {
    if (this.disposed) return;
    this.starting = true;
    this.buf = "";
    const enc = Buffer.from(PRELUDE, "utf16le").toString("base64");
    const p = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-NoLogo", "-EncodedCommand", enc],
      { windowsHide: true, stdio: ["pipe", "pipe", "ignore"] }
    );
    this.proc = p;

    p.stdout!.setEncoding("utf8");
    p.stdout!.on("data", (chunk: string) => this.onData(chunk));

    p.on("exit", () => {
      this.proc = null;
      this.starting = false;
      this.failAll();
      if (!this.disposed) setTimeout(() => this.ensure(), 400);
    });
    p.on("error", () => {
      this.proc = null;
      this.starting = false;
      this.failAll();
      if (!this.disposed) setTimeout(() => this.ensure(), 400);
    });

    // Warm up: request the session manager once so first real call is fast.
    setTimeout(() => { this.starting = false; }, 0);
  }

  private ensure() {
    if (this.disposed || this.proc || this.starting) return;
    this.spawnProc();
  }

  private onData(chunk: string) {
    this.buf += chunk;
    let start: number;
    while ((start = this.buf.indexOf("@@BEGIN@@")) >= 0) {
      const end = this.buf.indexOf("@@END@@", start);
      if (end < 0) break;
      const body = this.buf.slice(start + "@@BEGIN@@".length, end);
      this.buf = this.buf.slice(end + "@@END@@".length);
      const pending = this.queue.shift();
      if (pending) {
        clearTimeout(pending.timer);
        pending.resolve(body.trim());
      }
    }
  }

  private failAll() {
    const q = this.queue;
    this.queue = [];
    for (const p of q) {
      clearTimeout(p.timer);
      p.resolve("");
    }
  }

  request(script: string, timeout = 2500): Promise<string> {
    if (this.disposed) return Promise.resolve("");
    this.ensure();
    return new Promise((resolve) => {
      const entry: Pending = {
        resolve,
        timer: setTimeout(() => {
          // Timed out: drop this entry; if it was head-of-line the worker is
          // likely stuck, so restart it so queued calls recover.
          const i = this.queue.indexOf(entry);
          if (i >= 0) this.queue.splice(i, 1);
          resolve("");
          this.restart();
        }, timeout),
      };
      this.queue.push(entry);
      try {
        const payload = Buffer.from(script, "utf8").toString("base64");
        this.proc?.stdin?.write(payload + "\n");
      } catch {
        clearTimeout(entry.timer);
        const i = this.queue.indexOf(entry);
        if (i >= 0) this.queue.splice(i, 1);
        resolve("");
        this.restart();
      }
    });
  }

  private restart() {
    const p = this.proc;
    this.proc = null;
    this.starting = false;
    if (p) {
      try { p.kill(); } catch {}
    }
    if (!this.disposed) setTimeout(() => this.ensure(), 300);
  }

  dispose() {
    this.disposed = true;
    this.failAll();
    try { this.proc?.kill(); } catch {}
    this.proc = null;
  }
}

let mediaWorker: PsWorker | null = null;
let systemWorker: PsWorker | null = null;

// Two dedicated workers so the 500ms media poll is never stuck behind a slow
// system call (BT GATT reads can take ~1s). Keeps lyrics smooth.
export function getMediaWorker(): PsWorker {
  if (!mediaWorker) mediaWorker = new PsWorker();
  return mediaWorker;
}

export function getSystemWorker(): PsWorker {
  if (!systemWorker) systemWorker = new PsWorker();
  return systemWorker;
}

export function disposeWorkers() {
  mediaWorker?.dispose();
  systemWorker?.dispose();
  mediaWorker = null;
  systemWorker = null;
}

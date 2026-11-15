import { execFile } from "node:child_process";

// Only true fullscreen (video, slideshow, F11) compacts the notch.
// Maximized windows, including Chrome, do not.
const PS_FOREGROUND = `
$ErrorActionPreference='SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Fg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr mon, ref MONITORINFO mi);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, int flags);
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out uint pid);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  public static string Check() {
    IntPtr h = GetForegroundWindow();
    if (h == IntPtr.Zero || !IsWindowVisible(h)) return "none";
    RECT r; if (!GetWindowRect(h, out r)) return "none";
    bool zoomed = IsZoomed(h);
    IntPtr mon = MonitorFromWindow(h, 2);
    MONITORINFO mi = new MONITORINFO(); mi.cbSize = Marshal.SizeOf(mi);
    if (!GetMonitorInfo(mon, ref mi)) return "none";
    bool fullscreen = (r.L <= mi.rcMonitor.L && r.T <= mi.rcMonitor.T && r.R >= mi.rcMonitor.R && r.B >= mi.rcMonitor.B);
    bool covers = (r.L <= mi.rcWork.L && r.T <= mi.rcWork.T && r.R >= mi.rcWork.R && r.B >= mi.rcWork.B);
    uint pid; GetWindowThreadProcessId(h, out pid);
    string proc = "";
    try { proc = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName; } catch {}
    string state = fullscreen ? "fullscreen" : (zoomed || covers) ? "maxed" : "normal";
    return state + "|" + proc.ToLowerInvariant() + "|" + mi.rcMonitor.L + "," + mi.rcMonitor.T + "," + mi.rcMonitor.R + "," + mi.rcMonitor.B;
  }
}
"@
[Fg]::Check()
`;

function runPs(script: string): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
      { timeout: 4000, windowsHide: true, maxBuffer: 64 * 1024 },
      (_e, stdout) => resolve((stdout || "").trim())
    );
  });
}

export interface ForegroundState {
  compact: boolean;
  monitor: { x: number; y: number; right: number; bottom: number } | null;
}

export function startForegroundPolling(
  getMonitorRect: () => { x: number; y: number; right: number; bottom: number },
  cb: (state: ForegroundState) => void
) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const out = await runPs(PS_FOREGROUND);
      const [state, , rect] = out.split("|");
      if (state === "fullscreen") {
        const [l, t, r, b] = (rect || "").split(",").map(Number);
        const target = getMonitorRect();
        const onTarget = Number.isFinite(l) && Math.abs(l - target.x) < 2 && Math.abs(t - target.y) < 2;
        cb({ compact: onTarget, monitor: { x: l, y: t, right: r, bottom: b } });
      } else {
        cb({ compact: false, monitor: null });
      }
    } catch {
      cb({ compact: false, monitor: null });
    } finally {
      running = false;
      setTimeout(tick, 1500);
    }
  };
  tick();
}

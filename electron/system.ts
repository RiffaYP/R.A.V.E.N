import { execFile } from "node:child_process";
import { readFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSystemWorker } from "./ps";

export interface BtDevice {
  name: string;
  connected: boolean;
  battery: number | null;
}

export interface SystemInfo {
  battery: number;
  charging: boolean;
  batteryLife: number;
  batteryHealth: number;
  wifi: string | null;
  wifiConnected: boolean;
  volume: number;
  brightness: number;
  capsLock: boolean;
  bluetooth: boolean;
  bluetoothDevices: BtDevice[];
}

const PS_SYSTEM = `
$b=Get-CimInstance Win32_Battery | Select-Object -First 1
$battery=if($b){[int]$b.EstimatedChargeRemaining}else{100}
$charging=if($b){ [bool]($b.BatteryStatus -ge 2) }else{$false}
$life=if($b -and $b.EstimatedRunTime -gt 0 -and $b.EstimatedRunTime -lt 6000){[int]$b.EstimatedRunTime}else{0}
$wifi=(Get-NetConnectionProfile | Where-Object {$_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN'} | Select-Object -First 1 -ExpandProperty Name)
$wifiConnected=[bool]$wifi
$caps=[Console]::CapsLock
$bt=$false
try{
  $null=(Await ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus]))
  $radios=(Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]]))
  foreach($r in $radios){ if([string]$r.Kind -eq 'Bluetooth' -and [string]$r.State -eq 'On'){ $bt=$true } }
}catch{}
$brightness=(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty CurrentBrightness)
$btDevices=@()
try{
  $sel=[Windows.Devices.Bluetooth.BluetoothDevice]::GetDeviceSelectorFromPairingState($true)
  $devs=(Await ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($sel)) ([Windows.Devices.Enumeration.DeviceInformationCollection]))
  foreach($d in $devs){
    $conn=$false; $bat=$null; $nm=$d.Name
    try{
      $bd=(Await ([Windows.Devices.Bluetooth.BluetoothDevice]::FromIdAsync($d.Id)) ([Windows.Devices.Bluetooth.BluetoothDevice]))
      if($bd){
        $conn=([string]$bd.ConnectionStatus -eq 'Connected')
        if($nm -eq ''){$nm=$bd.Name}
        if($conn){
          try{
            $gs=(Await ($bd.GetGattServicesForUuidAsync([Guid]'0000180f-0000-1000-8000-00805f9b34fb')) ([Windows.Devices.Bluetooth.GenericAttributeProfile.GattDeviceServicesResult]))
            if($gs -and $gs.Services.Count -gt 0){
              $svc=$gs.Services[0]
              $cr=(Await ($svc.GetCharacteristicsForUuidAsync([Guid]'00002a19-0000-1000-8000-00805f9b34fb')) ([Windows.Devices.Bluetooth.GenericAttributeProfile.GattCharacteristicsResult]))
              if($cr -and $cr.Characteristics.Count -gt 0){
                $ch=$cr.Characteristics[0]
                $rr=(Await ($ch.ReadValueAsync([Windows.Devices.Bluetooth.BluetoothCacheMode]::Uncached)) ([Windows.Devices.Bluetooth.GenericAttributeProfile.GattReadResult]))
                if($rr -and $rr.Status -eq 0){
                  $buf=New-Object Windows.Storage.Streams.Buffer 1
                  $dr=[System.Runtime.InteropServices.WindowsRuntime.DataReader]::FromBuffer($rr.Value)
                  $bat=[int]$dr.ReadByte()
                }
              }
            }
          }catch{}
        }
      }
    }catch{}
    if($nm){ $btDevices += [pscustomobject]@{ name=$nm; connected=$conn; battery=$bat } }
  }
}catch{}
[pscustomobject]@{
  battery=$battery
  charging=$charging
  batteryLife=$life
  wifi=if($wifi){$wifi}else{$null}
  wifiConnected=$wifiConnected
  capsLock=[bool]$caps
  bluetooth=[bool]$bt
  bluetoothDevices=$btDevices
  brightness=if($brightness){[int]$brightness}else{0}
} | ConvertTo-Json -Compress -Depth 4
`;

const PS_VOLUME = `
try { [Audio]::Get() } catch { '' }
`;

function runPs(script: string): Promise<string> {
  return getSystemWorker().request(script, 3000);
}

let healthCache: number | null = null;
let healthLoading: Promise<number> | null = null;

function parseCapacity(html: string, label: string): number {
  const text = html.replace(/<[^>]*>/g, " ");
  const m = text.match(new RegExp(`${label}\\s+([\\d][\\d.,\\s]*?)\\s*mWh`, "i"));
  return m ? parseInt(m[1].replace(/[^\d]/g, ""), 10) : 0;
}

// Parsed once from `powercfg /batteryreport` (design vs full-charge capacity).
export function readBatteryHealth(): Promise<number> {
  if (healthCache !== null) return Promise.resolve(healthCache);
  if (healthLoading) return healthLoading;
  healthLoading = (async () => {
    const out = path.join(os.tmpdir(), `raven-battery-${process.pid}.html`);
    try {
      await new Promise<void>((resolve) => {
        execFile("powercfg", ["/batteryreport", "/output", out], { timeout: 10000, windowsHide: true }, () => resolve());
      });
      const html = readFileSync(out, "utf8");
      const design = parseCapacity(html, "DESIGN CAPACITY");
      const full = parseCapacity(html, "FULL CHARGE CAPACITY");
      healthCache = design > 0 && full > 0 ? Math.min(100, Math.round((full / design) * 100)) : 0;
    } catch {
      healthCache = 0;
    } finally {
      try {
        unlinkSync(out);
      } catch {}
    }
    return healthCache ?? 0;
  })();
  return healthLoading;
}

async function readSystem(): Promise<Partial<SystemInfo>> {
  const out = await runPs(PS_SYSTEM);
  const i = out.indexOf("{");
  try {
    return JSON.parse(i >= 0 ? out.slice(i) : "{}");
  } catch {
    return {};
  }
}

export function startSystemPolling(emit: (info: SystemInfo) => void) {
  let known: SystemInfo = {
    battery: 100,
    charging: false,
    batteryLife: 0,
    batteryHealth: 0,
    wifi: null,
    wifiConnected: false,
    volume: 0,
    brightness: 0,
    capsLock: false,
    bluetooth: false,
    bluetoothDevices: [],
  };
  let counter = 0;
  readBatteryHealth().then((v) => {
    known.batteryHealth = v;
  });

  const tick = async () => {
    try {
      const data = await readSystem();
      known = {
        ...known,
        battery: typeof data.battery === "number" ? data.battery : known.battery,
        charging: typeof data.charging === "boolean" ? data.charging : known.charging,
        batteryLife: typeof data.batteryLife === "number" ? data.batteryLife : known.batteryLife,
        wifi: data.wifi ?? null,
        wifiConnected: !!data.wifiConnected,
        capsLock: !!data.capsLock,
        bluetooth: !!data.bluetooth,
        bluetoothDevices: Array.isArray(data.bluetoothDevices) ? data.bluetoothDevices : [],
        brightness: typeof data.brightness === "number" ? data.brightness : known.brightness,
      };
      if (counter++ % 2 === 0) {
        const vol = await runPs(PS_VOLUME);
        const v = parseInt(vol, 10);
        if (!Number.isNaN(v)) known.volume = v;
      }
      emit(known);
    } catch {
    } finally {
      setTimeout(tick, 4000);
    }
  };
  tick();
}

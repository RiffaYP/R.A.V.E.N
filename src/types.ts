export interface LyricLine {
  t: number;
  text: string;
}

export interface MediaInfo {
  title: string;
  artist: string;
  lyrics: string;
  cover: string;
  progress: number;
  isPlaying: boolean;
  pos: number;
  duration: number;
  lines: LyricLine[];
  activeIndex: number;
  lyricsSynced: boolean;
  lyricOffset: number;
}

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

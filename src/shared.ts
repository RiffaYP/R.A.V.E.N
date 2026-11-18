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

export interface DisplayOption {
  index: number;
  label: string;
}

export interface ShelfItem {
  path: string;
  name: string;
  size: number;
  missing: boolean;
}

export type AccentMode = "preset" | "cover";
export type AccentColor = "white" | "blue" | "purple" | "green" | "orange" | "pink";
export type ThemePreset = "oled" | "slate" | "violet" | "frosted";

export interface SettingsState {
  scale: number;
  monitor: number;
  city: string;
  autostart: boolean;
  x: number | null;
  accentMode: AccentMode;
  accentColor: AccentColor;
  lyricOffset: number;
  geminiKey: string;
  hour24: boolean;
  mascot: boolean;
  theme: ThemePreset;
  displays: DisplayOption[];
}

export interface City {
  lat: number;
  lng: number;
  tz: number;
}

export const CITIES: Record<string, City> = {
  "Bandar Lampung": { lat: -5.4292, lng: 105.261, tz: 7 },
  Jakarta: { lat: -6.2088, lng: 106.8456, tz: 7 },
  Bandung: { lat: -6.9175, lng: 107.6191, tz: 7 },
  Surabaya: { lat: -7.2575, lng: 112.7521, tz: 7 },
  Medan: { lat: 3.5952, lng: 98.6722, tz: 7 },
  Makassar: { lat: -5.1477, lng: 119.4327, tz: 8 },
};

export const CITY_NAMES = Object.keys(CITIES);

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
  displays: DisplayOption[];
}

declare global {
  interface Window {
    raven: {
      onMedia: (cb: (info: MediaInfo | null) => void) => () => void;
      onSystem: (cb: (info: SystemInfo) => void) => () => void;
      clickThrough: (ignore: boolean) => void;
      command: (cmd: "toggle" | "next" | "prev") => void;
      seek: (ms: number) => void;
      quit: () => void;
      openSettings: () => void;
      getSettings: () => Promise<SettingsState>;
      readClipboard: () => Promise<string>;
      writeClipboard: (text: string) => Promise<void>;
      getPathForFile: (file: File) => string;
      shelfGet: () => Promise<ShelfItem[]>;
      shelfAdd: (paths: string[]) => Promise<ShelfItem[]>;
      shelfRemove: (path: string) => Promise<ShelfItem[]>;
      shelfClear: () => Promise<ShelfItem[]>;
      shelfOpen: (path: string) => void;
      shelfDrag: (path: string) => void;
      notifyTodo: (payload: { text: string; due: number }) => void;
      onCompact: (cb: (compact: boolean) => void) => () => void;
      toggleCompact: () => void;
      onScale: (cb: (scale: number) => void) => () => void;
      onAccent: (cb: (accent: { mode: AccentMode; color: AccentColor }) => void) => () => void;
      onHour24: (cb: (hour24: boolean) => void) => () => void;
      onMascot: (cb: (on: boolean) => void) => () => void;
      setSettings: (patch: Partial<SettingsState>) => Promise<SettingsState>;
    };
  }
}

import type {
  MediaInfo,
  SystemInfo,
  ShelfItem,
  SettingsState,
  AccentMode,
  AccentColor,
  ThemePreset,
  NotchShape,
} from "./shared";

export type {
  LyricLine,
  MediaInfo,
  BtDevice,
  SystemInfo,
  DisplayOption,
  ShelfItem,
  AccentMode,
  AccentColor,
  ThemePreset,
  NotchShape,
  SettingsState,
} from "./shared";

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
      onTheme: (cb: (theme: ThemePreset) => void) => () => void;
      onShape: (cb: (shape: NotchShape) => void) => () => void;
      onGlow: (cb: (glow: boolean) => void) => () => void;
      setSettings: (patch: Partial<SettingsState>) => Promise<SettingsState>;
    };
  }
}

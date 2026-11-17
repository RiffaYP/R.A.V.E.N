import { contextBridge, ipcRenderer, webUtils } from "electron";

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

contextBridge.exposeInMainWorld("raven", {
  onMedia: (cb: (info: MediaInfo | null) => void) => {
    const handler = (_e: unknown, info: MediaInfo | null) => cb(info);
    ipcRenderer.on("media:update", handler);
    return () => ipcRenderer.removeListener("media:update", handler);
  },
  onSystem: (cb: (info: SystemInfo) => void) => {
    const handler = (_e: unknown, info: SystemInfo) => cb(info);
    ipcRenderer.on("system:update", handler);
    return () => ipcRenderer.removeListener("system:update", handler);
  },
  clickThrough: (ignore: boolean) => ipcRenderer.send("win:clickthrough", ignore),
  command: (cmd: "toggle" | "next" | "prev") => ipcRenderer.send("media:command", cmd),
  seek: (ms: number) => ipcRenderer.send("media:seek", ms),
  quit: () => ipcRenderer.send("app:quit"),
  openSettings: () => ipcRenderer.send("settings:open"),
  getSettings: () => ipcRenderer.invoke("settings:get") as Promise<SettingsState>,
  readClipboard: () => ipcRenderer.invoke("clipboard:read") as Promise<string>,
  writeClipboard: (text: string) => ipcRenderer.invoke("clipboard:write", text) as Promise<void>,
  getPathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return "";
    }
  },
  shelfGet: () => ipcRenderer.invoke("shelf:get") as Promise<ShelfItem[]>,
  shelfAdd: (paths: string[]) => ipcRenderer.invoke("shelf:add", paths) as Promise<ShelfItem[]>,
  shelfRemove: (path: string) => ipcRenderer.invoke("shelf:remove", path) as Promise<ShelfItem[]>,
  shelfClear: () => ipcRenderer.invoke("shelf:clear") as Promise<ShelfItem[]>,
  shelfOpen: (path: string) => ipcRenderer.send("shelf:open", path),
  shelfDrag: (path: string) => ipcRenderer.send("shelf:drag", path),
  notifyTodo: (payload: { text: string; due: number }) => ipcRenderer.send("todo:notify", payload),
  onCompact: (cb: (compact: boolean) => void) => {
    const handler = (_e: unknown, compact: boolean) => cb(compact);
    ipcRenderer.on("notch:compact", handler);
    return () => ipcRenderer.removeListener("notch:compact", handler);
  },
  toggleCompact: () => ipcRenderer.send("notch:toggleCompact"),
  onScale: (cb: (scale: number) => void) => {
    const handler = (_e: unknown, scale: number) => cb(scale);
    ipcRenderer.on("settings:scale", handler);
    return () => ipcRenderer.removeListener("settings:scale", handler);
  },
  onAccent: (cb: (accent: { mode: AccentMode; color: AccentColor }) => void) => {
    const handler = (_e: unknown, accent: { mode: AccentMode; color: AccentColor }) => cb(accent);
    ipcRenderer.on("settings:accent", handler);
    return () => ipcRenderer.removeListener("settings:accent", handler);
  },
  onHour24: (cb: (hour24: boolean) => void) => {
    const handler = (_e: unknown, hour24: boolean) => cb(hour24);
    ipcRenderer.on("settings:hour24", handler);
    return () => ipcRenderer.removeListener("settings:hour24", handler);
  },
  onMascot: (cb: (on: boolean) => void) => {
    const handler = (_e: unknown, on: boolean) => cb(on);
    ipcRenderer.on("settings:mascot", handler);
    return () => ipcRenderer.removeListener("settings:mascot", handler);
  },
  onTheme: (cb: (theme: ThemePreset) => void) => {
    const handler = (_e: unknown, theme: ThemePreset) => cb(theme);
    ipcRenderer.on("settings:theme", handler);
    return () => ipcRenderer.removeListener("settings:theme", handler);
  },
  setSettings: (patch: Partial<SettingsState>) =>
    ipcRenderer.invoke("settings:set", patch) as Promise<SettingsState>,
});

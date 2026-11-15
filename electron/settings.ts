import { app } from "electron";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type AccentMode = "preset" | "cover";
export type AccentColor = "white" | "blue" | "purple" | "green" | "orange" | "pink";

export interface Settings {
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
}

const DEFAULTS: Settings = {
  scale: 100,
  monitor: -1,
  city: "Bandar Lampung",
  autostart: false,
  x: null,
  accentMode: "preset",
  accentColor: "white",
  lyricOffset: 0,
  geminiKey: "",
  hour24: true,
  mascot: true,
};

let current: Settings = { ...DEFAULTS };

function file() {
  return path.join(app.getPath("userData"), "settings.json");
}

export function loadSettings(): Settings {
  try {
    const raw = readFileSync(file(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    current = { ...DEFAULTS, ...parsed };
  } catch {
    current = { ...DEFAULTS };
  }
  return current;
}

export function getSettings(): Settings {
  return current;
}

export function saveSettings(patch: Partial<Settings>): Settings {
  current = { ...current, ...patch };
  try {
    writeFileSync(file(), JSON.stringify(current, null, 2), "utf8");
  } catch {}
  return current;
}

export function scaleFactor(): number {
  return Math.min(1.3, Math.max(0.75, current.scale / 100));
}

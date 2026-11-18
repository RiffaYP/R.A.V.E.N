import { app, safeStorage } from "electron";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type AccentMode = "preset" | "cover";
export type AccentColor = "white" | "blue" | "purple" | "green" | "orange" | "pink";
export type ThemePreset = "oled" | "slate" | "violet" | "frosted";
export type NotchShape = "attached" | "floating" | "glass";

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
  theme: ThemePreset;
  shape: NotchShape;
  glow: boolean;
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
  theme: "oled",
  shape: "attached",
  glow: true,
};

let current: Settings = { ...DEFAULTS };

function file() {
  return path.join(app.getPath("userData"), "settings.json");
}

// API key is stored encrypted at rest. Falls back to plaintext only when the OS
// keychain is unavailable (safeStorage unsupported), so the app still works.
function encryptKey(plain: string): string {
  if (!plain) return "";
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return "enc:" + safeStorage.encryptString(plain).toString("base64");
    }
  } catch {}
  return plain;
}

function decryptKey(stored: string): string {
  if (!stored) return "";
  if (stored.startsWith("enc:")) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), "base64"));
    } catch {
      return "";
    }
  }
  return stored;
}

export function loadSettings(): Settings {
  try {
    const raw = readFileSync(file(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Settings> & { geminiKey?: string };
    current = { ...DEFAULTS, ...parsed };
    current.geminiKey = decryptKey(parsed.geminiKey ?? "");
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
    const onDisk = { ...current, geminiKey: encryptKey(current.geminiKey) };
    writeFileSync(file(), JSON.stringify(onDisk, null, 2), "utf8");
  } catch {}
  return current;
}

export function scaleFactor(): number {
  return Math.min(1.3, Math.max(0.75, current.scale / 100));
}

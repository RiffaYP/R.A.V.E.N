import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useClock(hour24 = true) {
  const now = useNow(1000);
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !hour24 });
}

export function fmtTime(ms: number) {
  if (!ms || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

export function migrateDefaultCity() {
  try {
    if (localStorage.getItem("raven.cityMigrated") === "1") return;
    const city = localStorage.getItem("raven.city");
    if (city === JSON.stringify("Jakarta") || city === "Jakarta") {
      localStorage.setItem("raven.city", JSON.stringify("Bandar Lampung"));
    }
    const wcity = localStorage.getItem("raven.weatherCity");
    if (wcity === JSON.stringify("Jakarta") || wcity === "Jakarta") {
      localStorage.setItem("raven.weatherCity", JSON.stringify("Bandar Lampung"));
    }
    localStorage.setItem("raven.cityMigrated", "1");
  } catch {}
}

export const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const ACCENT_PRESETS: Record<string, string> = {
  white: "#f2f2f2",
  blue: "#5b9dff",
  purple: "#a985ff",
  green: "#39d98a",
  orange: "#ff9f43",
  pink: "#ff6fae",
};

export function presetAccent(color: string): string {
  return ACCENT_PRESETS[color] ?? ACCENT_PRESETS.white;
}

export function setAccent(hex: string) {
  document.documentElement.style.setProperty("--accent", hex);
  document.documentElement.style.setProperty("--accent-soft", hexToRgba(hex, 0.55));
  document.documentElement.style.setProperty("--accent-faint", hexToRgba(hex, 0.16));
}

export type ThemePreset = "oled" | "slate" | "violet" | "frosted";
export type NotchShape = "attached" | "floating" | "glass";

export function setShape(shape: NotchShape) {
  document.body.dataset.shape = shape;
}

export function setTheme(theme: ThemePreset) {
  const root = document.documentElement.style;
  switch (theme) {
    case "slate":
      root.setProperty("--notch-bg", "#0b0f19");
      root.setProperty("--notch-border", "rgba(91, 157, 255, 0.06)");
      root.setProperty("--notch-shadow", "0 4px 12px rgba(0, 0, 0, 0.6)");
      break;
    case "violet":
      root.setProperty("--notch-bg", "#120a1e");
      root.setProperty("--notch-border", "rgba(169, 133, 255, 0.08)");
      root.setProperty("--notch-shadow", "0 4px 14px rgba(20, 0, 40, 0.6)");
      break;
    case "frosted":
      root.setProperty("--notch-bg", "rgba(14, 14, 18, 0.78)");
      root.setProperty("--notch-border", "rgba(255, 255, 255, 0.05)");
      root.setProperty("--notch-shadow", "0 6px 18px rgba(0, 0, 0, 0.4)");
      break;
    case "oled":
    default:
      root.setProperty("--notch-bg", "#000000");
      root.setProperty("--notch-border", "rgba(255, 255, 255, 0.06)");
      root.setProperty("--notch-shadow", "0 3px 8px rgba(0, 0, 0, 0.5)");
      break;
  }
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function dominantAccent(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(ACCENT_PRESETS.white);
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let best = { r: 0, g: 0, b: 0, score: -1 };
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 200) continue;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const score = sat * 1.6 + lum * 0.6;
          if (score > best.score) best = { r, g, b, score };
        }
        const boosted = boostForDark(best.r, best.g, best.b);
        resolve(boosted);
      } catch {
        resolve(ACCENT_PRESETS.white);
      }
    };
    img.onerror = () => resolve(ACCENT_PRESETS.white);
    img.src = src;
  });
}

function boostForDark(r: number, g: number, b: number): string {
  let max = Math.max(r, g, b);
  if (max === 0) return ACCENT_PRESETS.white;
  const scale = Math.max(1, 200 / max);
  let nr = Math.min(255, Math.round(r * scale));
  let ng = Math.min(255, Math.round(g * scale));
  let nb = Math.min(255, Math.round(b * scale));
  const lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
  if (lum < 120) {
    const f = 120 / Math.max(1, lum);
    nr = Math.min(255, Math.round(nr * f));
    ng = Math.min(255, Math.round(ng * f));
    nb = Math.min(255, Math.round(nb * f));
  }
  return `#${[nr, ng, nb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

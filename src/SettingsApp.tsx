import { useEffect, useState } from "react";
import { CITY_NAMES, type SettingsState } from "./shared";
import { MONTHS_ID, presetAccent, setAccent } from "./lib";

const ACCENTS = [
  { value: "white", label: "Putih", hex: "#f2f2f2" },
  { value: "blue", label: "Biru", hex: "#5b9dff" },
  { value: "purple", label: "Ungu", hex: "#a985ff" },
  { value: "green", label: "Hijau", hex: "#39d98a" },
  { value: "orange", label: "Oranye", hex: "#ff9f43" },
  { value: "pink", label: "Pink", hex: "#ff6fae" },
] as const;

const THEMES = [
  { value: "oled", label: "Pure OLED" },
  { value: "slate", label: "Midnight Slate" },
  { value: "violet", label: "Cyber Violet" },
  { value: "frosted", label: "Frosted Glass" },
] as const;

export default function SettingsApp() {
  const [settings, setSettings] = useState<SettingsState | null>(null);

  useEffect(() => {
    window.raven.getSettings().then((s) => {
      setSettings(s);
      if (s.accentMode === "preset") setAccent(presetAccent(s.accentColor));
    });
  }, []);

  const update = async (patch: Partial<SettingsState>) => {
    const next = await window.raven.setSettings(patch);
    setSettings((prev) => (prev ? { ...prev, ...next } : next));
    if ("accentColor" in patch && next.accentMode === "preset") {
      setAccent(presetAccent(next.accentColor));
    }
    if ("accentMode" in patch && patch.accentMode === "preset") {
      setAccent(presetAccent(next.accentColor));
    }
  };

  if (!settings) {
    return (
      <div className="settings-root">
        <div className="settings-loading">Memuat…</div>
      </div>
    );
  }

  return (
    <div className="settings-root">
      <header className="settings-header">
        <div className="settings-logo">R</div>
        <div>
          <div className="settings-title">Pengaturan Raven</div>
          <div className="settings-subtitle">Sesuaikan notch dan integrasi sistem</div>
        </div>
      </header>

      <section className="settings-section">
        <div className="settings-label-row">
          <span className="settings-label">Ukuran notch</span>
          <span className="settings-value">{settings.scale}%</span>
        </div>
        <input
          type="range"
          min={75}
          max={130}
          step={5}
          value={settings.scale}
          onChange={(e) => update({ scale: Number(e.target.value) })}
        />
        <div className="settings-hint">Skala proporsional 75%–130%.</div>
      </section>

      <section className="settings-section">
        <span className="settings-label">Monitor</span>
        <select
          className="settings-select"
          value={settings.monitor}
          onChange={(e) => update({ monitor: Number(e.target.value) })}
        >
          <option value={-1}>Monitor utama (default)</option>
          {settings.displays.map((d) => (
            <option key={d.index} value={d.index}>{d.label}</option>
          ))}
        </select>
      </section>

      <section className="settings-section">
        <span className="settings-label">Lokasi default</span>
        <select
          className="settings-select"
          value={settings.city}
          onChange={(e) => update({ city: e.target.value })}
        >
          {CITY_NAMES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="settings-hint">Dipakai untuk jadwal sholat & cuaca.</div>
      </section>

      <section className="settings-section">
        <div className="settings-label-row">
          <span className="settings-label">Offset lirik</span>
          <span className="settings-value">
            {settings.lyricOffset > 0 ? "+" : ""}{settings.lyricOffset} ms
          </span>
        </div>
        <input
          type="range"
          min={-1000}
          max={1000}
          step={50}
          value={settings.lyricOffset}
          onChange={(e) => update({ lyricOffset: Number(e.target.value) })}
        />
        <div className="settings-hint">Geser waktu lirik. Positif = lirik lebih awal.</div>
      </section>

      <section className="settings-section">
        <span className="settings-label">Warna aksen</span>
        <div className="accent-modes">
          <button
            className={`accent-mode ${settings.accentMode === "preset" ? "on" : ""}`}
            onClick={() => update({ accentMode: "preset" })}
          >Warna</button>
          <button
            className={`accent-mode ${settings.accentMode === "cover" ? "on" : ""}`}
            onClick={() => update({ accentMode: "cover" })}
          >Ikuti cover</button>
        </div>
        {settings.accentMode === "preset" && (
          <div className="accent-swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                className={`accent-swatch ${settings.accentColor === a.value ? "on" : ""}`}
                style={{ background: a.hex }}
                onClick={() => update({ accentColor: a.value })}
                title={a.label}
                aria-label={a.label}
              />
            ))}
          </div>
        )}
        <div className="settings-hint">
          {settings.accentMode === "cover"
            ? "Warna mengikuti cover lagu yang diputar."
            : "Pilih warna sorotan di seluruh notch."}
        </div>
      </section>

      <section className="settings-section">
        <span className="settings-label">Tema notch</span>
        <div className="accent-modes theme-modes">
          {THEMES.map((t) => (
            <button
              key={t.value}
              className={`accent-mode ${settings.theme === t.value ? "on" : ""}`}
              onClick={() => update({ theme: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="settings-hint">
          Ubah latar belakang notch. Frosted Glass tembus pandang dengan wallpaper.
        </div>
      </section>

      <section className="settings-section">
        <span className="settings-label">Gemini API key</span>
        <input
          className="settings-input"
          type="password"
          placeholder="Tempel API key Gemini"
          value={settings.geminiKey}
          onChange={(e) => update({ geminiKey: e.target.value })}
          spellCheck={false}
        />
        <div className="settings-hint">
          Untuk Terjemah. Gratis dari Google AI Studio. Disimpan terenkripsi (Windows) di settings.json.
        </div>
      </section>

      <section className="settings-section settings-row">
        <div>
          <span className="settings-label">Format 24 jam</span>
          <div className="settings-hint">Matikan untuk format 12 jam (AM/PM).</div>
        </div>
        <button
          className={`settings-toggle ${settings.hour24 ? "on" : ""}`}
          onClick={() => update({ hour24: !settings.hour24 })}
          aria-label="Format 24 jam"
        >
          <span />
        </button>
      </section>

      <section className="settings-section settings-row">
        <div>
          <span className="settings-label">Mascot idle</span>
          <div className="settings-hint">Mata Raven muncul saat notch diam (jam tersembunyi).</div>
        </div>
        <button
          className={`settings-toggle ${settings.mascot ? "on" : ""}`}
          onClick={() => update({ mascot: !settings.mascot })}
          aria-label="Mascot idle"
        >
          <span />
        </button>
      </section>

      <section className="settings-section settings-row">
        <div>
          <span className="settings-label">Mulai saat login</span>
          <div className="settings-hint">Jalankan Raven otomatis saat Windows menyala.</div>
        </div>
        <button
          className={`settings-toggle ${settings.autostart ? "on" : ""}`}
          onClick={() => update({ autostart: !settings.autostart })}
          aria-label="Autostart"
        >
          <span />
        </button>
      </section>

      <section className="settings-section settings-row">
        <div>
          <span className="settings-label">Posisi notch</span>
          <div className="settings-hint">Kembalikan ke tengah monitor terpilih.</div>
        </div>
        <button className="settings-btn" onClick={() => update({ x: null })}>Reset</button>
      </section>

      <footer className="settings-footer">Raven · {MONTHS_ID[new Date().getMonth()]} {new Date().getFullYear()}</footer>
    </div>
  );
}

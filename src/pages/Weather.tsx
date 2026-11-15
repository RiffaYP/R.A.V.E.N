import { useEffect, useState } from "react";
import { useLocalStorage } from "../lib";
import PageHeader from "../components/PageHeader";

const CITIES: Record<string, { lat: number; lng: number }> = {
  "Bandar Lampung": { lat: -5.4292, lng: 105.2610 },
  Jakarta: { lat: -6.2088, lng: 106.8456 },
  Bandung: { lat: -6.9175, lng: 107.6191 },
  Surabaya: { lat: -7.2575, lng: 112.7521 },
  Medan: { lat: 3.5952, lng: 98.6722 },
  Makassar: { lat: -5.1477, lng: 119.4327 },
};

const CODES: Record<number, string> = {
  0: "Cerah", 1: "Cerah berawan", 2: "Berawan", 3: "Mendung",
  45: "Berkabut", 48: "Kabut", 51: "Gerimis", 53: "Gerimis", 55: "Gerimis",
  61: "Hujan", 63: "Hujan", 65: "Hujan lebat", 80: "Hujan lokal", 81: "Hujan", 82: "Hujan lebat",
  95: "Badai", 96: "Badai", 99: "Badai",
};

type IconKind = "sun" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "heavy" | "storm";

function kindOf(code: number): IconKind {
  if (code === 0) return "sun";
  if (code === 1) return "partly";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code === 61 || code === 63 || code === 80 || code === 81) return "rain";
  if (code === 65 || code === 82) return "heavy";
  if (code >= 95) return "storm";
  return "cloud";
}

function WeatherIcon({ code }: { code: number }) {
  const kind = kindOf(code);
  return (
    <svg className="weather-ico" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {kind === "sun" && (
        <>
          <circle cx="24" cy="24" r="9" fill="var(--accent, #f2f2f2)" />
          <g stroke="var(--accent, #f2f2f2)" strokeWidth="2.4" strokeLinecap="round">
            <line x1="24" y1="4" x2="24" y2="9" /><line x1="24" y1="39" x2="24" y2="44" />
            <line x1="4" y1="24" x2="9" y2="24" /><line x1="39" y1="24" x2="44" y2="24" />
            <line x1="10" y1="10" x2="13.5" y2="13.5" /><line x1="34.5" y1="34.5" x2="38" y2="38" />
            <line x1="38" y1="10" x2="34.5" y2="13.5" /><line x1="13.5" y1="34.5" x2="10" y2="38" />
          </g>
        </>
      )}
      {(kind === "partly" || kind === "cloud" || kind === "drizzle" || kind === "rain" || kind === "heavy" || kind === "storm" || kind === "fog") && (
        <>
          {kind === "partly" && <circle cx="18" cy="18" r="7" fill="var(--accent, #f2f2f2)" opacity="0.9" />}
          <path d="M14 30a8 8 0 0 1 1-15.9A10 10 0 0 1 34 16a7 7 0 0 1 1 14z" fill="var(--accent, #f2f2f2)" opacity={kind === "partly" ? 0.85 : 1} />
        </>
      )}
      {kind === "fog" && (
        <g stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round">
          <line x1="10" y1="36" x2="38" y2="36" /><line x1="14" y1="41" x2="34" y2="41" />
        </g>
      )}
      {(kind === "drizzle" || kind === "rain" || kind === "heavy") && (
        <g stroke="var(--accent, #f2f2f2)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
          {kind !== "heavy" && <><line x1="18" y1="35" x2="16" y2="41" /><line x1="26" y1="35" x2="24" y2="41" /><line x1="34" y1="35" x2="32" y2="41" /></>}
          {kind === "heavy" && <><line x1="16" y1="34" x2="13" y2="42" /><line x1="24" y1="34" x2="21" y2="42" /><line x1="32" y1="34" x2="29" y2="42" /></>}
        </g>
      )}
      {kind === "storm" && (
        <path d="M24 33l-6 9h5l-2 6 8-11h-5z" fill="var(--accent, #ffd83a)" />
      )}
    </svg>
  );
}

export default function Weather() {
  const [city, setCity] = useLocalStorage<string>("raven.weatherCity", "Bandar Lampung");
  const [tab, setTab] = useState<"now" | "hour" | "day">("now");
  const [cur, setCur] = useState<{ temp: number; code: number; wind: number } | null>(null);
  const [hours, setHours] = useState<{ time: string; temp: number; code: number }[]>([]);
  const [days, setDays] = useState<{ date: string; code: number; max: number; min: number }[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    window.raven.getSettings().then((s) => {
      if (alive && s.city && CITIES[s.city]) setCity(s.city);
    });
    return () => { alive = false; };
  }, []);

  const chooseCity = (value: string) => {
    setCity(value);
    window.raven.setSettings({ city: value }).catch(() => {});
  };

  useEffect(() => {
    const c = CITIES[city] ?? CITIES["Bandar Lampung"];
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}` +
      `&current=temperature_2m,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=7`;
    let alive = true;
    setError(false);
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setCur({
          temp: j?.current?.temperature_2m ?? 0,
          code: j?.current?.weather_code ?? 0,
          wind: j?.current?.wind_speed_10m ?? 0,
        });
        const ht: string[] = j?.hourly?.time ?? [];
        const hT: number[] = j?.hourly?.temperature_2m ?? [];
        const hC: number[] = j?.hourly?.weather_code ?? [];
        const nowMs = Date.now();
        const start = Math.max(0, ht.findIndex((t) => new Date(t).getTime() >= nowMs - 3.6e6));
        const next: typeof hours = [];
        for (let i = start; i < ht.length && next.length < 12; i++) {
          next.push({ time: ht[i], temp: hT[i] ?? 0, code: hC[i] ?? 0 });
        }
        setHours(next);
        const dt: string[] = j?.daily?.time ?? [];
        const dC: number[] = j?.daily?.weather_code ?? [];
        const dMax: number[] = j?.daily?.temperature_2m_max ?? [];
        const dMin: number[] = j?.daily?.temperature_2m_min ?? [];
        setDays(dt.map((date, i) => ({ date, code: dC[i] ?? 0, max: dMax[i] ?? 0, min: dMin[i] ?? 0 })));
      })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [city]);

  return (
    <div className="page weather has-head">
      <PageHeader
        title="Cuaca"
        sub={city}
        right={
          <select value={city} onChange={(e) => chooseCity(e.target.value)} className="prayer-select">
            {Object.keys(CITIES).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        }
      />

      <div className="wx-tabs">
        <button className={tab === "now" ? "on" : ""} onClick={() => setTab("now")}>Sekarang</button>
        <button className={tab === "hour" ? "on" : ""} onClick={() => setTab("hour")}>Jam</button>
        <button className={tab === "day" ? "on" : ""} onClick={() => setTab("day")}>7 Hari</button>
      </div>

      {error ? (
        <div className="tools-empty">Gagal memuat cuaca</div>
      ) : !cur ? (
        <div className="tools-empty">Memuat…</div>
      ) : tab === "now" ? (
        <div className="wx-now">
          <div className="weather-main">
            <WeatherIcon code={cur.code} />
            <div className="weather-temp">{Math.round(cur.temp)}°<span>C</span></div>
          </div>
          <div className="weather-desc">{CODES[cur.code] ?? "—"}</div>
          <div className="weather-wind">Angin {Math.round(cur.wind)} km/j</div>
        </div>
      ) : tab === "hour" ? (
        <div className="wx-hours">
          {hours.map((h) => (
            <div className="wx-hour" key={h.time}>
              <span className="wx-hour-t">{new Date(h.time).getHours().toString().padStart(2, "0")}</span>
              <WeatherIcon code={h.code} />
              <span className="wx-hour-temp">{Math.round(h.temp)}°</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="wx-days">
          {days.map((d, i) => {
            const dow = new Date(d.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short" });
            return (
              <div className="wx-day" key={d.date}>
                <span className="wx-day-name">{i === 0 ? "Hari ini" : dow}</span>
                <WeatherIcon code={d.code} />
                <span className="wx-day-min">{Math.round(d.min)}°</span>
                <span className="wx-day-max">{Math.round(d.max)}°</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

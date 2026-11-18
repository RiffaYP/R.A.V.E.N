import { useEffect, useMemo } from "react";
import { useLocalStorage, useNow } from "../lib";
import { CITIES, CITY_NAMES } from "../shared";
import PageHeader from "../components/PageHeader";

function degToRad(d: number) { return (d * Math.PI) / 180; }
function radToDeg(r: number) { return (r * 180) / Math.PI; }

function prayerTimes(lat: number, lng: number, date: Date, tz: number) {
  const jd = Math.floor(date.getTime() / 86400000) + 2440588;
  const d = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * d) % 360;
  const q = (280.459 + 0.98564736 * d) % 360;
  const L = (q + 1.915 * Math.sin(degToRad(g)) + 0.02 * Math.sin(degToRad(2 * g))) % 360;
  const e = 23.439 - 0.00000036 * d;
  const RA = radToDeg(Math.atan2(Math.cos(degToRad(e)) * Math.sin(degToRad(L)), Math.cos(degToRad(L)))) / 15;
  const eqt = q / 15 - ((RA + 24) % 24);
  const decl = radToDeg(Math.asin(Math.sin(degToRad(e)) * Math.sin(degToRad(L))));
  const noon = 12 + tz - lng / 15 - eqt;

  // hour-angle for a given solar elevation (degrees above horizon)
  const elevationHourAngle = (elevationDeg: number) => {
    const cosH =
      (Math.sin(degToRad(elevationDeg)) - Math.sin(degToRad(lat)) * Math.sin(degToRad(decl))) /
      (Math.cos(degToRad(lat)) * Math.cos(degToRad(decl)));
    const clamped = Math.min(1, Math.max(-1, cosH));
    return radToDeg(Math.acos(clamped)) / 15;
  };

  const fajr = noon - elevationHourAngle(-18);
  const sunrise = noon - elevationHourAngle(-0.833);
  const dhuhr = noon + 1 / 60;
  // Asr (Shafi'i): shadow length = object + its shadow at noon
  const asrElevation = radToDeg(Math.atan(1 / (1 + Math.tan(degToRad(Math.abs(lat - decl))))));
  const asr = noon + elevationHourAngle(asrElevation);
  const maghrib = noon + elevationHourAngle(-0.833);
  const isha = noon + elevationHourAngle(-18);

  const toStr = (h: number) => {
    h = ((h % 24) + 24) % 24;
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    const m2 = mm === 60 ? 0 : mm;
    const h3 = mm === 60 ? hh + 1 : hh;
    return `${String(h3 % 24).padStart(2, "0")}:${String(m2).padStart(2, "0")}`;
  };

  return [
    { name: "Subuh", time: toStr(fajr) },
    { name: "Terbit", time: toStr(sunrise) },
    { name: "Dzuhur", time: toStr(dhuhr) },
    { name: "Ashar", time: toStr(asr) },
    { name: "Maghrib", time: toStr(maghrib) },
    { name: "Isya", time: toStr(isha) },
  ];
}

export default function Prayer() {
  const now = useNow(1000);
  const [city, setCity] = useLocalStorage<string>("raven.city", "Bandar Lampung");
  const coords = CITIES[city] ?? CITIES["Bandar Lampung"];

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
  const times = useMemo(() => prayerTimes(coords.lat, coords.lng, now, coords.tz), [now, coords.lat, coords.lng, coords.tz]);

  const currentMin = now.getHours() * 60 + now.getMinutes();
  const parsed = times.map((t) => {
    const [h, m] = t.time.split(":").map(Number);
    return { ...t, min: h * 60 + m };
  });
  const next = parsed.find((t) => t.min > currentMin) ?? parsed[0];

  return (
    <div className="page prayer has-head">
      <PageHeader
        title="Jadwal Sholat"
        right={
          <select value={city} onChange={(e) => chooseCity(e.target.value)} className="prayer-select">
            {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        }
      />
      <div className="prayer-list">
        {parsed.map((t) => (
          <div key={t.name} className={`prayer-item ${t.name === next.name ? "next" : ""}`}>
            <span>{t.name}</span>
            <span className="prayer-time">{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

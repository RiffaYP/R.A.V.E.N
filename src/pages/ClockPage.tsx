import { useNow, DAYS_ID, MONTHS_ID } from "../lib";
import PageHeader from "../components/PageHeader";

export default function ClockPage() {
  const now = useNow(1000);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div className="page clock-page has-head">
      <PageHeader title="Jam & Kalender" icon="calendar" />
      <div className="clock-left">
        <div className="big-time">{hh}:{mm}<span className="sec">:{ss}</span></div>
        <div className="big-date">{DAYS_ID[now.getDay()]}, {now.getDate()} {MONTHS_ID[month]} {year}</div>
      </div>
      <div className="cal">
        <div className="cal-head">{MONTHS_ID[month]} {year}</div>
        <div className="cal-grid">
          {["S", "S", "R", "K", "J", "S", "S"].map((d, i) => <span key={`h${i}`} className="cal-dow">{d}</span>)}
          {cells.map((d, i) => (
            <span key={i} className={`cal-day ${d === now.getDate() ? "today" : ""} ${d ? "" : "empty"}`}>{d ?? ""}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { SystemInfo } from "../types";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";

function Bar({ value }: { value: number }) {
  return <div className="sys-bar"><div className="sys-bar-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

function fmtLife(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export default function SystemPage({ info }: { info: SystemInfo | null }) {
  const s = info;
  return (
    <div className="page sys has-head">
      <PageHeader title="Sistem" icon="cpu" />
      <div className="sys-card">
        <div className="sys-row">
          <span className={`sys-ico ${s?.charging ? "on" : ""}`}><Icon name="bolt" size={13} /></span>
          <div className="sys-main">
            <div className="sys-label">Baterai</div>
            <div className="sys-value">{s ? `${s.battery}%` : "--%"}{s?.charging ? " · charging" : ""}</div>
            <div className="sys-sub">
              {s?.batteryLife ? `± ${fmtLife(s.batteryLife)}` : "Sisa —"}
              {" · "}
              {s?.batteryHealth ? `Health ${s.batteryHealth}%` : "Health —"}
            </div>
          </div>
        </div>
        <Bar value={s?.battery ?? 0} />
      </div>

      <div className="sys-card">
        <div className="sys-row">
          <span className={`sys-ico ${s?.wifiConnected ? "on" : ""}`}><Icon name="wifi" size={13} /></span>
          <div className="sys-main">
            <div className="sys-label">WiFi</div>
            <div className="sys-value">{s?.wifiConnected ? s?.wifi ?? "Terhubung" : "Tidak terhubung"}</div>
          </div>
        </div>
      </div>

      <div className="sys-card">
        <div className="sys-row">
          <span className={`sys-ico ${s?.bluetooth ? "on" : ""}`}><Icon name="bluetooth" size={13} /></span>
          <div className="sys-main">
            <div className="sys-label">Bluetooth</div>
            <div className="sys-value">{s?.bluetooth ? "Aktif" : "Mati"}</div>
          </div>
        </div>
        {s?.bluetoothDevices?.filter((d) => d.connected).map((d) => (
          <div className="sys-dev" key={d.name} title={d.name}>
            <span className="sys-dev-name">{d.name}</span>
            <span className={`sys-dev-bat ${d.battery !== null && d.battery <= 20 ? "low" : ""}`}>
              {d.battery !== null ? `${d.battery}%` : "Terhubung"}
            </span>
          </div>
        ))}
      </div>

      <div className="sys-card">
        <div className="sys-row">
          <span className={`sys-ico ${s?.capsLock ? "on" : ""}`}><Icon name="keyboard" size={13} /></span>
          <div className="sys-main">
            <div className="sys-label">Caps Lock</div>
            <div className="sys-value">{s?.capsLock ? "Aktif" : "Mati"}</div>
          </div>
        </div>
      </div>

      <div className="sys-card">
        <div className="sys-row">
          <span className="sys-ico"><Icon name="volume" size={13} /></span>
          <div className="sys-main">
            <div className="sys-label">Volume</div>
            <div className="sys-value">{s?.volume ?? 0}%</div>
          </div>
        </div>
        <Bar value={s?.volume ?? 0} />
      </div>

      <div className="sys-card">
        <div className="sys-row">
          <span className="sys-ico"><Icon name="sun" size={13} /></span>
          <div className="sys-main">
            <div className="sys-label">Kecerahan</div>
            <div className="sys-value">{s?.brightness ? `${s.brightness}%` : "—"}</div>
          </div>
        </div>
        {s?.brightness ? <Bar value={s.brightness} /> : null}
      </div>
    </div>
  );
}

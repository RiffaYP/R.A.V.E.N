import { useEffect, useRef, useState } from "react";
import type { MediaInfo, SystemInfo } from "./types";
import { useClock, presetAccent, setAccent, dominantAccent } from "./lib";
import Media from "./pages/Media";
import ClockPage from "./pages/ClockPage";
import Pomodoro from "./pages/Pomodoro";
import SystemPage from "./pages/SystemPage";
import Tools from "./pages/Tools";
import Prayer from "./pages/Prayer";
import Water from "./pages/Water";
import Weather from "./pages/Weather";
import Translate from "./pages/Translate";
import RavenMascot from "./components/RavenMascot";
import Icon from "./components/Icon";

const PAGES = [
  { id: "media", label: "Musik" },
  { id: "clock", label: "Jam" },
  { id: "pomodoro", label: "Pomodoro" },
  { id: "system", label: "Sistem" },
  { id: "tools", label: "Alat" },
  { id: "prayer", label: "Sholat" },
  { id: "water", label: "Water" },
  { id: "weather", label: "Cuaca" },
  { id: "translate", label: "Terjemah" },
] as const;

const ARC_R = 7;
const ARC_C = 2 * Math.PI * ARC_R;

function getWaterPct(): number {
  try {
    const raw = localStorage.getItem("raven.water");
    if (!raw) return 0;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const data = JSON.parse(raw);
    if (data.date !== today) return 0;
    return Math.min(100, Math.max(0, Math.round(((data.count || 0) / 8) * 100)));
  } catch {
    return 0;
  }
}

function checkPomoActive(): boolean {
  try {
    const raw = localStorage.getItem("raven.pomodoro2");
    if (!raw) return false;
    const p = JSON.parse(raw);
    return !!p.running && !!p.endAt && p.endAt > Date.now();
  } catch {
    return false;
  }
}

export default function App() {
  const [hour24, setHour24] = useState(true);
  const time = useClock(hour24);
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [peekTitle, setPeekTitle] = useState(false);
  const [notice, setNotice] = useState<null | "charging" | "headphone">(null);
  const [noticeDevice, setNoticeDevice] = useState<string>("");
  const [compact, setCompact] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [mascotOn, setMascotOn] = useState(true);
  const [showMascot, setShowMascot] = useState(false);
  const [pomoActive, setPomoActive] = useState(false);
  const [waterPct, setWaterPct] = useState(0);
  const accentRef = useRef<{ mode: "preset" | "cover"; color: string }>({ mode: "preset", color: "white" });
  const prevSystem = useRef<SystemInfo | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  const timer = useRef<number | undefined>(undefined);
  const notchRef = useRef<HTMLDivElement>(null);
  const ignoreRef = useRef<boolean | null>(null);

  useEffect(() => window.raven.onMedia(setMedia), []);
  useEffect(() => window.raven.onSystem(setSystem), []);
  useEffect(() => window.raven.onCompact(setCompact), []);

  useEffect(() => {
    const updateStats = () => {
      setPomoActive(checkPomoActive());
      setWaterPct(getWaterPct());
    };
    updateStats();
    const id = window.setInterval(updateStats, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const apply = (scale: number) => {
      const v = Math.min(1.3, Math.max(0.75, scale / 100));
      document.documentElement.style.setProperty("--ui-scale", String(v));
    };
    window.raven.getSettings().then((s) => apply(s.scale));
    return window.raven.onScale(apply);
  }, []);

  useEffect(() => {
    window.raven.getSettings().then((s) => {
      setHour24(s.hour24 !== false);
      setMascotOn(s.mascot !== false);
    });
    const offHour = window.raven.onHour24(setHour24);
    const offMascot = window.raven.onMascot?.(setMascotOn);
    return () => {
      offHour();
      offMascot?.();
    };
  }, []);

  useEffect(() => {
    if (!mascotOn || expanded || hovering || compact || peekTitle) {
      setShowMascot(false);
      return;
    }
    let cancelled = false;
    let timer: number;
    const cycle = (phase: "clock" | "mascot") => {
      if (cancelled) return;
      setShowMascot(phase === "mascot");
      const dur = phase === "mascot" ? 6000 : 8000;
      timer = window.setTimeout(() => cycle(phase === "mascot" ? "clock" : "mascot"), dur);
    };
    timer = window.setTimeout(() => cycle("mascot"), 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mascotOn, expanded, hovering, compact, peekTitle]);

  useEffect(() => {
    const applyAccent = (mode: "preset" | "cover", color: string, cover: string) => {
      accentRef.current = { mode, color };
      if (mode === "cover") {
        if (cover) dominantAccent(cover).then(setAccent);
        else setAccent(presetAccent("white"));
      } else {
        setAccent(presetAccent(color));
      }
    };
    window.raven.getSettings().then((s) => {
      accentRef.current = { mode: s.accentMode, color: s.accentColor };
      applyAccent(s.accentMode, s.accentColor, media?.cover ?? "");
    });
    const off = window.raven.onAccent((a) => {
      accentRef.current = { mode: a.mode, color: a.color };
      applyAccent(a.mode, a.color, media?.cover ?? "");
    });
    return off;
  }, []);

  useEffect(() => {
    const { mode, color } = accentRef.current;
    if (mode === "cover" && media?.cover) dominantAccent(media.cover).then(setAccent);
  }, [media?.cover]);

  useEffect(() => {
    const canPeek = !expanded && !!media?.isPlaying && !!media?.title;
    if (!canPeek) {
      setPeekTitle(false);
      return;
    }
    let showing = false;
    const id = setInterval(() => {
      showing = !showing;
      setPeekTitle(showing);
    }, 6000);
    return () => clearInterval(id);
  }, [expanded, media?.isPlaying, media?.title]);

  useEffect(() => {
    if (!system) return;
    const prev = prevSystem.current;
    prevSystem.current = system;
    if (!prev) return;
    let kind: null | "charging" | "headphone" = null;
    if (system.charging && !prev.charging) kind = "charging";
    else {
      const prevConnected = new Set((prev.bluetoothDevices ?? []).filter((d) => d.connected).map((d) => d.name));
      const nowConnected = (system.bluetoothDevices ?? []).find((d) => d.connected && !prevConnected.has(d.name));
      if (nowConnected) {
        kind = "headphone";
        setNoticeDevice(nowConnected.name);
      }
    }
    if (!kind) return;
    setNotice(kind);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  }, [system]);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      const el = notchRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inside =
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (ignoreRef.current !== !inside) {
        ignoreRef.current = !inside;
        window.raven.clickThrough(!inside);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const expand = () => {
    window.clearTimeout(timer.current);
    setHovering(true);
    setExpanded(true);
  };
  const collapse = () => {
    timer.current = window.setTimeout(() => {
      setExpanded(false);
      setHovering(false);
    }, 180);
  };

  const isCompact = compact && !hovering;

  const prev = () => {
    setDir(-1);
    setPage((p) => (p - 1 + PAGES.length) % PAGES.length);
  };
  const next = () => {
    setDir(1);
    setPage((p) => (p + 1) % PAGES.length);
  };
  const goTo = (i: number) => {
    setDir(i >= page ? 1 : -1);
    setPage(i);
  };

  const hasMedia = !!media;
  const current = PAGES[page];

  const battery = system?.battery ?? 100;
  const isDesktop = battery === 100 && !system?.charging;
  const arcPct = Math.min(100, Math.max(0, isDesktop && waterPct > 0 ? waterPct : battery));
  const arcLabel = isDesktop && waterPct > 0 ? `Air: ${waterPct}%` : `Baterai: ${battery}%`;

  return (
    <div
      className="stage"
      onContextMenu={(e) => {
        e.preventDefault();
        window.raven.quit();
      }}
    >
      <div
        ref={notchRef}
        className={`notch ${expanded ? "open" : ""} ${isCompact ? "compact" : ""} ${notice && !expanded ? "notice-open" : ""}`}
        onMouseEnter={expand}
        onMouseLeave={collapse}
      >
        <div className="content">
          {notice && (
            <div className={`notice ${notice}`}>
              <div className="notice-icon">
                <Icon name={notice === "charging" ? "bolt" : "headphone"} size={18} />
              </div>
              <div className="notice-text">
                <span className="notice-title">{notice === "charging" ? "Charging" : "Headphone"}</span>
                <span className="notice-sub">{notice === "charging" ? "Charger terhubung" : noticeDevice || "Perangkat terhubung"}</span>
              </div>
              {notice === "charging" && system && <span className="notice-value">{system.battery}%</span>}
            </div>
          )}

          <div className={`clock-layer ${expanded ? "at-corner" : ""}`}>
            {!expanded && !showMascot && (
              <div className="clock-arc-wrap" title={arcLabel}>
                <svg className="clock-arc-svg" viewBox="0 0 18 18" aria-hidden="true">
                  <circle className="clock-arc-bg" cx="9" cy="9" r={ARC_R} />
                  <circle
                    className="clock-arc-fg"
                    cx="9"
                    cy="9"
                    r={ARC_R}
                    strokeDasharray={ARC_C}
                    strokeDashoffset={ARC_C * (1 - arcPct / 100)}
                  />
                </svg>
                <span
                  className={`dot ${pomoActive ? "pomo-pulse" : hasMedia ? "" : "idle"}`}
                />
              </div>
            )}
            {!expanded && showMascot ? (
              <RavenMascot active={hovering} />
            ) : !expanded && peekTitle && media?.title ? (
              <span className="peek-title">
                <span className="peek-track">{media.title}{media.artist ? ` · ${media.artist}` : ""}</span>
              </span>
            ) : (
              <span className="clock">{time}</span>
            )}
            {!expanded && !showMascot && media?.isPlaying && (
              <span className="mini-eq" aria-label="Audio visualizer" title={`Memutar: ${media.title}`}>
                <span /><span /><span />
              </span>
            )}
          </div>

          <div className={`panel ${expanded ? "show" : ""}`}>
            <div
              className="page-shell"
              key={current.id}
              style={{ ["--dir" as string]: `${dir * 14}px` }}
            >
              {current.id === "media" && <Media media={media} />}
              {current.id === "clock" && <ClockPage />}
              {current.id === "pomodoro" && <Pomodoro />}
              {current.id === "system" && <SystemPage info={system} />}
              {current.id === "tools" && <Tools />}
              {current.id === "prayer" && <Prayer />}
              {current.id === "water" && <Water />}
              {current.id === "weather" && <Weather />}
              {current.id === "translate" && <Translate />}
            </div>

            <button className="nav-arrow left" onClick={prev} aria-label="Sebelumnya"><Icon name="chevronLeft" size={16} /></button>
            <button className="nav-arrow right" onClick={next} aria-label="Berikutnya"><Icon name="chevronRight" size={16} /></button>

            <div className="dots">
              {PAGES.map((p, i) => (
                <button
                  key={p.id}
                  className={`nav-dot ${i === page ? "on" : ""}`}
                  onClick={() => goTo(i)}
                  aria-label={p.label}
                  title={p.label}
                />
              ))}
            </div>
            <button className="settings-gear" onClick={() => window.raven.openSettings()} aria-label="Pengaturan" title="Pengaturan"><Icon name="settings" size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocalStorage, useNow } from "../lib";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";

type Phase = "focus" | "break";

interface PomoState {
  phase: Phase;
  focusMin: number;
  breakMin: number;
  running: boolean;
  remaining: number;
  endAt: number | null;
}

const DEFAULT: PomoState = {
  phase: "focus",
  focusMin: 25,
  breakMin: 5,
  running: false,
  remaining: 25 * 60,
  endAt: null,
};

function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function Pomodoro() {
  const now = useNow(1000);
  const [state, setState] = useLocalStorage<PomoState>("raven.pomodoro2", DEFAULT);

  const durationSec = (state.phase === "focus" ? state.focusMin : state.breakMin) * 60;
  const remaining =
    state.running && state.endAt
      ? Math.max(0, Math.ceil((state.endAt - now.getTime()) / 1000))
      : state.remaining;

  useEffect(() => {
    if (!(state.running && remaining === 0)) return;
    setState((prev) => {
      const nextPhase: Phase = prev.phase === "focus" ? "break" : "focus";
      const nextDur = (nextPhase === "focus" ? prev.focusMin : prev.breakMin) * 60;
      return { ...prev, phase: nextPhase, running: false, remaining: nextDur, endAt: null };
    });
  }, [remaining, state.running, setState]);

  const progress = durationSec > 0 ? 1 - remaining / durationSec : 0;

  const toggle = () => {
    if (state.running) {
      setState({ ...state, running: false, remaining, endAt: null });
    } else {
      if (remaining <= 0) return;
      setState({ ...state, running: true, endAt: now.getTime() + remaining * 1000 });
    }
  };
  const reset = () =>
    setState({ ...state, running: false, remaining: durationSec, endAt: null });
  const setPhase = (phase: Phase) => {
    const dur = (phase === "focus" ? state.focusMin : state.breakMin) * 60;
    setState({ ...state, phase, running: false, remaining: dur, endAt: null });
  };
  const setMinutes = (which: "focusMin" | "breakMin", value: number) => {
    const clamped = Math.max(1, Math.min(180, Math.floor(value) || 1));
    const next = { ...state, [which]: clamped } as PomoState;
    if (state.phase === (which === "focusMin" ? "focus" : "break")) {
      next.remaining = clamped * 60;
      next.running = false;
      next.endAt = null;
    }
    setState(next);
  };

  return (
    <div className="page pomo has-head">
      <PageHeader
        title="Pomodoro"
        sub={state.phase === "focus" ? "Fokus" : "Istirahat"}
        right={
          <div className="pomo-tabs">
            <button className={`chip ${state.phase === "focus" ? "on" : ""}`} onClick={() => setPhase("focus")}>Fokus</button>
            <button className={`chip ${state.phase === "break" ? "on" : ""}`} onClick={() => setPhase("break")}>Istirahat</button>
          </div>
        }
      />
      <div className="pomo-left">
        <div className="pomo-ring">
          <svg viewBox="0 0 120 120">
            <circle className="pomo-ring-bg" cx="60" cy="60" r="52" />
            <circle
              className="pomo-ring-fg"
              cx="60"
              cy="60"
              r="52"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - progress)}
            />
          </svg>
          <div className="pomo-ring-label">
            <div className="pomo-time">{fmtClock(remaining)}</div>
            <div className="pomo-until">{remaining === 0 ? "selesai" : "menuju selesai"}</div>
          </div>
        </div>
      </div>

      <div className="pomo-right">
        <div className="pomo-actions">
          <button className="pomo-btn" onClick={toggle}>
            {state.running ? "Pause" : remaining === 0 ? "Selesai" : "Mulai"}
          </button>
          <button className="pomo-round-btn" onClick={reset} aria-label="Reset">
            <Icon name="refresh" size={13} />
          </button>
        </div>
        <div className="pomo-config">
          <label>
            <span>Fokus</span>
            <input
              type="number"
              min={1}
              max={180}
              value={state.focusMin}
              onChange={(e) => setMinutes("focusMin", Number(e.target.value))}
            />
            <span>mnt</span>
          </label>
          <label>
            <span>Istirahat</span>
            <input
              type="number"
              min={1}
              max={180}
              value={state.breakMin}
              onChange={(e) => setMinutes("breakMin", Number(e.target.value))}
            />
            <span>mnt</span>
          </label>
        </div>
      </div>
    </div>
  );
}

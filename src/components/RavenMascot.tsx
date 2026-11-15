import { useEffect, useRef, useState } from "react";

type Mood = "awake" | "blink" | "wave";

export default function RavenMascot({ active }: { active: boolean }) {
  const [mood, setMood] = useState<Mood>("awake");
  const [waveTick, setWaveTick] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (active) {
      setMood("wave");
      setWaveTick((t) => t + 1);
    }
  }, [active]);

  useEffect(() => {
    const blink = window.setInterval(() => {
      setMood("blink");
      window.setTimeout(() => setMood((m) => (m === "blink" ? "awake" : m)), 170);
    }, 3400 + Math.random() * 2000);
    return () => window.clearInterval(blink);
  }, []);

  useEffect(() => {
    if (mood !== "wave") return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMood("awake"), 620);
    return () => window.clearTimeout(timer.current);
  }, [mood, waveTick]);

  const closed = mood === "blink";
  return (
    <span className={`mascot ${mood}`} aria-hidden="true">
      <svg viewBox="0 0 48 24" className="mascot-svg">
        <defs>
          <radialGradient id="eyeHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#b98cff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7a4dd6" stopOpacity="0" />
          </radialGradient>
        </defs>
        {!closed ? (
          <g className="mascot-eyes">
            <ellipse cx="14" cy="12" rx="11" ry="9" fill="url(#eyeHalo)" className="halo-l" />
            <ellipse cx="34" cy="12" rx="11" ry="9" fill="url(#eyeHalo)" className="halo-r" />
            <path d="M24 13.5 C20 13 8.5 8.5 5 10.5 C8 15.5 18 17.5 24 13.5 Z" fill="#fff" className="eye-l" />
            <path d="M24 13.5 C28 13 39.5 8.5 43 10.5 C40 15.5 30 17.5 24 13.5 Z" fill="#fff" className="eye-r" />
          </g>
        ) : (
          <g className="mascot-sleep" stroke="#c9a8ff" strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M6 12 Q14 15 23 12" />
            <path d="M25 12 Q34 15 42 12" />
          </g>
        )}
      </svg>
    </span>
  );
}

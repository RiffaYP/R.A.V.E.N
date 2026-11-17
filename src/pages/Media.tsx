import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { MediaInfo } from "../types";
import { fmtTime } from "../lib";
import PageHeader from "../components/PageHeader";
import UIIcon from "../components/Icon";

const WINDOW = 3;

function isInstrumentalBreak(
  lines: { t: number; text: string }[],
  activeIndex: number,
  livePos: number,
  duration: number,
  offset: number
): boolean {
  if (lines.length === 0) return false;
  const adj = livePos + 100 + offset;
  if (activeIndex === -1) {
    const firstT = lines[0].t;
    return firstT >= 6000 && adj >= 1000 && adj < firstT - 1500;
  }
  const currT = lines[activeIndex].t;
  const nextT =
    activeIndex + 1 < lines.length
      ? lines[activeIndex + 1].t
      : duration > currT
      ? duration
      : currT;
  const gap = nextT - currT;
  return gap >= 6000 && adj >= currT + 2500 && adj < nextT - 1500;
}

function LyricRow({ text, active }: { text: string; active: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [marquee, setMarquee] = useState(false);

  useEffect(() => {
    if (!active) {
      setMarquee(false);
      return;
    }
    const r = rowRef.current;
    const t = textRef.current;
    if (r && t) {
      const diff = t.scrollWidth - r.clientWidth;
      if (diff > 8) {
        r.style.setProperty("--scroll-dist", `${diff}px`);
        setMarquee(true);
        return;
      }
    }
    setMarquee(false);
  }, [active, text]);

  return (
    <div
      ref={rowRef}
      className={`lyric ${active ? "on" : ""} ${marquee ? "marquee" : ""}`}
    >
      <span ref={textRef} className="lyric-text">{text}</span>
    </div>
  );
}

function Icon({ name }: { name: "prev" | "play" | "pause" | "next" }) {
  const paths: Record<string, React.ReactNode> = {
    prev: (
      <>
        <rect x="3" y="5" width="2.4" height="14" rx="1.2" />
        <path d="M20 5.5v13a1 1 0 0 1-1.6.8l-9-6.5a1 1 0 0 1 0-1.6l9-6.5a1 1 0 0 1 1.6.8z" />
      </>
    ),
    next: (
      <>
        <rect x="18.6" y="5" width="2.4" height="14" rx="1.2" />
        <path d="M4 5.5v13a1 1 0 0 0 1.6.8l9-6.5a1 1 0 0 0 0-1.6l-9-6.5A1 1 0 0 0 4 5.5z" />
      </>
    ),
    play: <path d="M7 4.5v15a1 1 0 0 0 1.5.87l13-7.5a1 1 0 0 0 0-1.74l-13-7.5A1 1 0 0 0 7 4.5z" />,
    pause: (
      <>
        <rect x="6" y="4.5" width="4" height="15" rx="1.3" />
        <rect x="14" y="4.5" width="4" height="15" rx="1.3" />
      </>
    ),
  };
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paths[name]}</svg>;
}

export default function Media({ media }: { media: MediaInfo | null }) {
  const [scrub, setScrub] = useState<number | null>(null);
  const anchor = useRef({ pos: 0, at: 0, key: "" });
  const [, bump] = useState(0);
  const hasMedia = !!media;
  const duration = media?.duration ?? 0;

  const lines = media?.lines ?? [];
  const key = media ? `${media.title}|${media.artist}` : "";

  const lastKey = useRef("");
  useEffect(() => {
    if (!media) return;
    if (lastKey.current !== key) {
      lastKey.current = key;
      setScrub(null);
    }
    anchor.current = { pos: media.pos, at: performance.now(), key };
  }, [media?.pos, key]);

  useEffect(() => {
    if (!media?.isPlaying) return;
    const id = window.setInterval(() => bump((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [media?.isPlaying, key]);

  // Local dead-reckoning between 500ms GSMTC updates; offset positive = earlier.
  const anchored = !!media?.isPlaying && anchor.current.key === key && anchor.current.at > 0;
  const livePos = anchored ? anchor.current.pos + (performance.now() - anchor.current.at) : media?.pos ?? 0;
  const liveProgress = duration > 0 ? Math.min(1, Math.max(0, livePos / duration)) : media?.progress ?? 0;
  const progress = scrub ?? liveProgress;
  const offset = media?.lyricOffset ?? 0;
  let activeIndex = media?.activeIndex ?? -1;
  if (media?.lyricsSynced) {
    activeIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].t <= livePos + 100 + offset) activeIndex = i;
      else break;
    }
  }
  const showLyrics = lines.length > 0;
  const synced = showLyrics && !!media?.lyricsSynced;
  const isBreak = synced && isInstrumentalBreak(lines, activeIndex, livePos, duration, offset);
  const sliceStart = synced ? Math.max(0, activeIndex - 1) : 0;
  const visible = synced ? lines.slice(sliceStart, sliceStart + WINDOW) : [];
  const activeLocal = activeIndex - sliceStart;

  const dragging = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const seekTo = (clientX: number, el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setScrub(ratio);
    return ratio;
  };
  const onDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    dragging.current = true;
    seekTo(e.clientX, e.currentTarget);
  };
  useEffect(() => {
    if (!duration) return;
    const move = (e: globalThis.MouseEvent) => {
      if (!dragging.current || !barRef.current) return;
      seekTo(e.clientX, barRef.current);
    };
    const up = (e: globalThis.MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      if (barRef.current) {
        const ratio = seekTo(e.clientX, barRef.current);
        window.raven.seek(ratio * duration);
      }
      setScrub(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [duration]);

  return (
    <div className="page media has-head">
      {media?.cover && (
        <div className="media-bg" style={{ backgroundImage: `url("${media.cover}")` }} />
      )}
      <PageHeader title="Musik" sub={media?.isPlaying ? "Memutar" : media ? "Dijeda" : "Tidak ada media"} />
      <div className={`art ${media?.cover ? "has-img" : ""}`}>
        {media?.cover ? <img src={media.cover} alt="" /> : <span className="art-icon"><UIIcon name="music" size={24} /></span>}
        {media?.isPlaying && (
          <span className="eq">
            <span /><span /><span /><span />
          </span>
        )}
      </div>

      <div className="info">
        <div className="title" title={media?.title}>{media?.title ?? "Tidak ada media"}</div>
        {media?.artist && <div className="artist">{media.artist}</div>}
      </div>

      {synced ? (
        <div className="lyrics-scroll media-lyrics">
          {isBreak ? (
            <div className="lyric-break" aria-label="Instrumental">
              <span className="break-dot" />
              <span className="break-dot" />
              <span className="break-dot" />
              <span className="break-note">♪</span>
              <span className="break-dot" />
              <span className="break-dot" />
              <span className="break-dot" />
            </div>
          ) : (
            visible.map((l, i) => (
              <LyricRow
                key={sliceStart + i}
                text={l.text}
                active={i === activeLocal}
              />
            ))
          )}
        </div>
      ) : showLyrics ? (
        <div className="lyrics-plain media-lyrics">{lines.map((line, i) => <p key={i}>{line.text}</p>)}</div>
      ) : (
        <div className="lyrics-empty media-lyrics">Lirik tidak tersedia</div>
      )}

      <div className={`bar ${hasMedia ? "" : "off"}`}>
        <div className="progress-row" ref={barRef} onMouseDown={onDown}>
          <div className="track">
            <div className="fill" style={{ width: `${progress * 100}%` }} />
            <div className="knob" style={{ left: `${progress * 100}%` }} />
          </div>
          {duration > 0 && <span className="tstamp">{fmtTime(progress * duration)}</span>}
        </div>
        <div className="btns">
          <button aria-label="Previous" onClick={() => window.raven.command("prev")}><Icon name="prev" /></button>
          <button className="play" aria-label={media?.isPlaying ? "Pause" : "Play"} onClick={() => window.raven.command("toggle")}>
            <Icon name={media?.isPlaying ? "pause" : "play"} />
          </button>
          <button aria-label="Next" onClick={() => window.raven.command("next")}><Icon name="next" /></button>
        </div>
      </div>
    </div>
  );
}

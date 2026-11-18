// Pseudo-spectrum bars. GSMTC exposes no audio samples, so each bar height is a
// deterministic function of the track position (progress), giving motion that
// tracks the song instead of a free-running CSS loop.
function barAmp(progress: number, i: number): number {
  const p = progress * 100 + i * 1.7;
  const a = Math.sin(p * 0.9 + i) * 0.5 + 0.5;
  const b = Math.sin(p * 2.3 + i * 2.1) * 0.5 + 0.5;
  const c = Math.sin(p * 0.37 + i * 0.6) * 0.5 + 0.5;
  return Math.min(1, 0.18 + a * 0.45 + b * 0.25 + c * 0.12);
}

export default function Visualizer({
  progress,
  playing,
  bars = 5,
  className = "",
}: {
  progress: number;
  playing: boolean;
  bars?: number;
  className?: string;
}) {
  return (
    <span className={`viz ${playing ? "on" : "off"} ${className}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{ ["--amp" as string]: playing ? barAmp(progress, i) : 0.12 }} />
      ))}
    </span>
  );
}

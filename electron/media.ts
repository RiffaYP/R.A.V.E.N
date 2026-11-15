import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { app } from "electron";
import { getSettings } from "./settings";

export interface LyricLine {
  t: number;
  text: string;
}

export interface MediaInfo {
  title: string;
  artist: string;
  lyrics: string;
  cover: string;
  progress: number;
  isPlaying: boolean;
  pos: number;
  duration: number;
  lines: LyricLine[];
  activeIndex: number;
  lyricsSynced: boolean;
  lyricOffset: number;
}

interface LrclibResult {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  syncedLyrics?: string;
  plainLyrics?: string;
}

// ponytail: PowerShell+WinRT tiap 500ms. Ganti native addon kalau butuh <50ms.
const PS_READ = `
$ErrorActionPreference='SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
function Await($op, $type){
  $method=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1
  return $method.MakeGenericMethod($type).Invoke($null,@($op)).GetAwaiter().GetResult()
}
$m=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$current=$m.GetCurrentSession()
$s=$null
$paused=$null
foreach($candidate in $m.GetSessions()){
  $status=[string]$candidate.GetPlaybackInfo().PlaybackStatus
  if($status -eq 'Playing'){ $s=$candidate; break }
  if($status -eq 'Paused' -and -not $paused){ $paused=$candidate }
}
if(-not $s){ $s=$paused }
if(-not $s){ $s=$current }
if(-not $s){ '{}'; exit }
$p=Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
$pb=$s.GetPlaybackInfo()
$tl=$s.GetTimelineProperties()
[pscustomobject]@{
  title=$p.Title; artist=$p.Artist
  status=[string]$pb.PlaybackStatus
  pos=$tl.Position.TotalMilliseconds
  end=$tl.EndTime.TotalMilliseconds
  updated=$tl.LastUpdatedTime.ToUnixTimeMilliseconds()
} | ConvertTo-Json -Compress
`;

function readMedia(): Promise<any> {
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(PS_READ, "utf16le").toString("base64")],
      { timeout: 4000, windowsHide: true, maxBuffer: 1024 * 1024 },
      (_err, stdout) => {
        try {
          resolve(JSON.parse(stderrless(stdout)));
        } catch {
          resolve({});
        }
      }
    );
  });
}

function stderrless(s: string) {
  const t = (s || "").trim();
  const i = t.indexOf("{");
  return i >= 0 ? t.slice(i) : "{}";
}

function runPowerShell(script: string, timeout = 4000, maxBuffer = 1024 * 1024) {
  execFile(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")],
    { timeout, windowsHide: true, maxBuffer }
  );
}

function psCommand(cmd: "toggle" | "next" | "prev"): string {
  const action =
    cmd === "next"
      ? "$s.TrySkipNextAsync()"
      : cmd === "prev"
      ? "$s.TrySkipPreviousAsync()"
      : "$(if([string]$s.GetPlaybackInfo().PlaybackStatus -eq 'Playing'){$s.TryPauseAsync()}else{$s.TryPlayAsync()})";
  return `
$ErrorActionPreference='SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
function Await($op, $type){ $method=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1; return $method.MakeGenericMethod($type).Invoke($null,@($op)).GetAwaiter().GetResult() }
$m=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$s=$m.GetCurrentSession()
if($s){ [void](Await (${action}) ([bool])) }
`;
}

export function mediaCommand(cmd: "toggle" | "next" | "prev") {
  runPowerShell(psCommand(cmd));
}

export function mediaSeek(ms: number) {
  const ticks = Math.max(0, Math.round(ms)) * 10000;
  const ps = `
$ErrorActionPreference='SilentlyContinue'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
function Await($op, $type){ $method=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 } | Select-Object -First 1; return $method.MakeGenericMethod($type).Invoke($null,@($op)).GetAwaiter().GetResult() }
$m=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$s=$m.GetCurrentSession()
if($s){ [void](Await ($s.TryChangePlaybackPositionAsync([long]${ticks})) ([bool])) }
`;
  runPowerShell(ps);
}

interface Cache {
  key: string;
  lyrics: LyricLine[];
  lyricsSynced: boolean;
  cover: string;
}

let cache: Cache = { key: "", lyrics: [], lyricsSynced: false, cover: "" };
const coverCache = new Map<string, string>();

async function fetchCover(title: string, artist: string): Promise<string> {
  const key = `${title}|${artist}`;
  const cached = coverCache.get(key);
  if (cached) return cached;

  const filename = `${createHash("sha256").update(key).digest("hex")}.jpg`;
  const dir = path.join(app.getPath("userData"), "covers");
  const file = path.join(dir, filename);
  try {
    await readFile(file);
    const url = pathToFileURL(file).href;
    coverCache.set(key, url);
    return url;
  } catch {}

  const term = encodeURIComponent(`${title} ${artist}`.trim());
  const search = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(search, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const data = (await res.json()) as {
      results?: { artworkUrl100?: string }[];
    };
    const artwork = data.results?.[0]?.artworkUrl100?.replace("100x100", "600x600");
    if (!artwork) return "";

    const imageController = new AbortController();
    const imageTimeout = setTimeout(() => imageController.abort(), 7000);
    const image = await fetch(artwork, { signal: imageController.signal });
    clearTimeout(imageTimeout);
    if (!image.ok) return "";
    const bytes = Buffer.from(await image.arrayBuffer());
    await mkdir(dir, { recursive: true });
    await writeFile(file, bytes);
    const url = pathToFileURL(file).href;
    coverCache.set(key, url);
    return url;
  } catch {
    return "";
  }
}

// ponytail: heuristic cleanup, upgrade to audio fingerprint match if wrong
// versions still slip through.
function cleanTitle(value: string) {
  return (
    value
      .replace(/\s*[([][^)\]]*(?:feat|ft|remix|remaster|live|version|edit|official|lyrics?|audio|video|mv)[^)\]]*[)\]]/gi, " ")
      .replace(/\s*[-–—]\s*(?:feat|ft|remix|remaster|live|radio edit|official|lyrics?|audio|video|mv|version)\b.*$/gi, " ")
      .replace(/\s+/g, " ")
      .trim() || value.trim()
  );
}

function cleanArtist(value: string) {
  return (
    value
      .replace(/\s*[-–—]\s*topic\s*$/i, "")
      .replace(/\s*[-–—]\s*official\s*$/i, "")
      .replace(/\s*vevo\s*$/i, "")
      .replace(/\s*(?:official\s+)?(?:artist|channel)\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim() || value.trim()
  );
}

export function resolveMetadata(title: string, artist: string) {
  const baseArtist = cleanArtist(artist);
  let track = title.trim();
  let by = baseArtist;
  const split = track.match(/^(.{1,80}?)\s+[-–—]\s+(.+)$/);
  if (split) {
    const left = cleanArtist(split[1]);
    const wanted = normalizeMeta(baseArtist);
    const candidate = normalizeMeta(left);
    if (candidate && (candidate === wanted || wanted.includes(candidate) || overlap(candidate, wanted) >= 0.5)) {
      by = left;
      track = split[2];
    }
  }
  return { track: cleanTitle(track), artist: by };
}

function normalizeMeta(value: string) {
  return value
    .toLowerCase()
    .replace(/\s*[([][^)\]]*[)\]]/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function overlap(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const words = new Set(a.split(" "));
  const other = b.split(" ");
  let hit = 0;
  for (const w of other) if (words.has(w)) hit++;
  return hit / Math.max(words.size, other.length);
}

export function pickResult(results: LrclibResult[], title: string, artist: string, durationMs: number) {
  const target = durationMs > 0 ? durationMs / 1000 : 0;
  const wantedTitle = normalizeMeta(title);
  const wantedArtist = normalizeMeta(artist);
  const usable = results.filter((r) => !r.instrumental && (r.syncedLyrics || r.plainLyrics));
  const near =
    target > 0 ? usable.filter((r) => !r.duration || Math.abs(r.duration - target) <= 5) : usable;
  const pool = near.length > 0 ? near : usable;
  let best: { result: LrclibResult; score: number } | null = null;
  for (const r of pool) {
    let score =
      (r.syncedLyrics ? 6 : 0) +
      overlap(wantedTitle, normalizeMeta(r.trackName || "")) * 5 +
      overlap(wantedArtist, normalizeMeta(r.artistName || "")) * 3;
    if (target > 0 && r.duration) score -= Math.min(10, Math.abs(r.duration - target));
    if (!best || score > best.score) best = { result: r, score };
  }
  return best?.result ?? null;
}

async function searchLyrics(track: string, artist: string): Promise<LrclibResult[]> {
  const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(
    track
  )}&artist_name=${encodeURIComponent(artist)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Raven/1.0" },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    return (await res.json()) as LrclibResult[];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLyrics(title: string, artist: string, durationMs: number) {
  const mainArtist = (artist.split(/\s+(?:feat\.?|ft\.?|with)\s+/i)[0] || artist).trim();
  let results = await searchLyrics(cleanTitle(title), mainArtist);
  if (results.length === 0) results = await searchLyrics(title, artist);
  const exact = pickResult(results, title, artist, durationMs);
  if (!exact) return { lines: [] as LyricLine[], synced: false };
  if (exact.syncedLyrics) {
    return { lines: parseLrc(exact.syncedLyrics), synced: true };
  }
  const lines = (exact.plainLyrics || "")
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ t: 0, text }));
  return { lines, synced: false };
}

export function parseLrc(src: string) {
  const out: { t: number; text: string }[] = [];
  let offset = 0;
  for (const rawLine of src.split(/\r?\n/)) {
    const raw = rawLine.replace(/^\uFEFF/, "");
    const off = raw.match(/^\[offset:\s*([+-]?\d+)\s*\]/i);
    if (off) {
      offset = +off[1];
      continue;
    }
    const stamps = [...raw.matchAll(/\[(\d+):(\d+)(?:[.:](\d+))?\]/g)];
    if (stamps.length === 0) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").replace(/<[^>]*>/g, "").trim();
    if (!text) continue;
    for (const m of stamps) {
      const frac = m[3] ? +m[3].padEnd(3, "0").slice(0, 3) : 0;
      out.push({ t: +m[1] * 60000 + +m[2] * 1000 + frac, text });
    }
  }
  return out.map((l) => ({ ...l, t: l.t + offset })).sort((a, b) => a.t - b.t);
}

export function startMediaPolling(emit: (info: MediaInfo | null) => void) {
  let missed = 0;
  let lastKey = "";

  const tick = async () => {
    try {
      const data = await readMedia();
      if (!data.title) {
        if (++missed >= 40) {
          if (lastKey !== "") {
            lastKey = "";
            cache = { key: "", lyrics: [], lyricsSynced: false, cover: "" };
            emit(null);
          }
        }
        return;
      }
      missed = 0;
      const title = data.title as string;
      const artist = (data.artist as string) || "";
      const key = `${title}|${artist}`;
      if (key !== lastKey) {
        lastKey = key;
        const meta = resolveMetadata(title, artist);
        const [lyricsResult, cover] = await Promise.all([
          fetchLyrics(meta.track, meta.artist, Number(data.end) || 0),
          fetchCover(meta.track, meta.artist),
        ]);
        cache = {
          key,
          lyrics: lyricsResult.lines,
          lyricsSynced: lyricsResult.synced,
          cover,
        };
      }
      const duration = Number(data.end) || 0;
      let pos = Number(data.pos) || 0;
      // Chrome/YouTube often freezes TimelineProperties.Position while playing.
      // Extrapolate from the last time the source actually updated it.
      const updated = Number(data.updated) || 0;
      if (data.status === "Playing" && updated > 0) {
        const ahead = Date.now() - updated;
        if (ahead > 0 && ahead < 3_600_000) pos += ahead;
      }
      if (duration > 0) pos = Math.min(pos, duration);
      const lyricOffset = getSettings().lyricOffset || 0;
      let activeIndex = -1;
      for (let i = 0; i < cache.lyrics.length; i++) {
        if (cache.lyrics[i].t <= pos + 100 + lyricOffset) activeIndex = i;
        else break;
      }
      const lyric = activeIndex >= 0 ? cache.lyrics[activeIndex].text : "";
      const progress =
        duration > 0 ? Math.min(1, Math.max(0, pos / duration)) : 0;
      emit({
        title,
        artist,
        lyrics: lyric,
        cover: cache.cover,
        progress,
        isPlaying: data.status === "Playing",
        pos,
        duration,
        lines: cache.lyrics,
        activeIndex,
        lyricsSynced: cache.lyricsSynced,
        lyricOffset,
      });
    } catch {
    } finally {
      setTimeout(tick, 500);
    }
  };

  tick();
}

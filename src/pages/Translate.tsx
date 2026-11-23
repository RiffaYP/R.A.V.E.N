import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import { LANGS, geminiGenerate, translatePrompt } from "../ai";

export default function Translate() {
  const [target, setTarget] = useState("en");
  const [latin, setLatin] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasKey, setHasKey] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const lang = LANGS.find((l) => l.code === target) ?? LANGS[1];
  const showLatin = lang.latinOnly;

  useEffect(() => {
    window.raven.getSettings().then((s) => setHasKey(!!s.geminiKey));
  }, []);

  const run = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const s = await window.raven.getSettings();
    if (!s.geminiKey) {
      setHasKey(false);
      setError("Atur Gemini API key di Pengaturan dulu.");
      return;
    }
    setHasKey(true);
    setError("");
    setBusy(true);
    setOutput("");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const result = await geminiGenerate(s.geminiKey, translatePrompt(text, target, showLatin && latin), ctrl.signal);
      setOutput(result);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Gagal menerjemahkan");
    } finally {
      if (abortRef.current === ctrl) setBusy(false);
    }
  };

  const copy = () => {
    if (output) window.raven.writeClipboard(output).catch(() => {});
  };

  return (
    <div className="page tr has-head">
      <PageHeader
        title="Terjemah"
        icon="languages"
        right={
          <div className="tr-controls">
            {showLatin && (
              <button
                className={`tr-latin ${latin ? "on" : ""}`}
                onClick={() => setLatin((v) => !v)}
                title={latin ? "Output: latin (romaji/pinyin)" : "Output: skrip asli"}
                aria-label="Mode output latin"
              >Aa</button>
            )}
            <select value={target} onChange={(e) => { setTarget(e.target.value); setOutput(""); }} className="prayer-select">
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        }
      />

      <textarea
        className="tr-input"
        placeholder="Teks untuk diterjemahkan…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            run();
          }
        }}
        spellCheck={false}
      />

      <button className="tr-go" onClick={run} disabled={busy || !input.trim()}>
        {busy ? "Menerjemahkan…" : "Terjemahkan"}
      </button>

      <div className="tr-out">
        {error ? (
          <div className="tr-err">{error}</div>
        ) : output ? (
          <>
            <div className="tr-result">{output}</div>
            <button className="tr-copy" onClick={copy} title="Salin" aria-label="Salin hasil">
              <Icon name="copy" size={13} />
            </button>
          </>
        ) : (
          <div className="tr-hint">{hasKey ? "Hasil terjemahan muncul di sini." : "API key belum diatur (Pengaturan ⚙)."}</div>
        )}
      </div>
    </div>
  );
}

const MODEL = "gemini-flash-lite-latest";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export async function geminiGenerate(apiKey: string, prompt: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`);
  }
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Respons kosong dari Gemini");
  return text.trim();
}

export interface Lang {
  code: string;
  label: string;
  latinOnly: boolean;
}

export const LANGS: Lang[] = [
  { code: "id", label: "Indonesia", latinOnly: false },
  { code: "en", label: "Inggris", latinOnly: false },
  { code: "tl", label: "Tagalog", latinOnly: false },
  { code: "ja", label: "Jepang", latinOnly: true },
  { code: "ko", label: "Korea", latinOnly: true },
  { code: "ar", label: "Arab", latinOnly: true },
  { code: "zh", label: "Mandarin", latinOnly: true },
  { code: "es", label: "Spanyol", latinOnly: false },
  { code: "fr", label: "Prancis", latinOnly: false },
];

const LANG_NAME: Record<string, string> = {
  id: "Indonesian",
  en: "English",
  tl: "Tagalog",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  es: "Spanish",
  fr: "French",
};

export function translatePrompt(text: string, targetCode: string, latin: boolean): string {
  const target = LANG_NAME[targetCode] ?? "English";
  const latinNote = latin
    ? ` Write the result in Latin script (romanization/transliteration), e.g. romaji for Japanese, pinyin for Chinese, romanization for Korean, Latin transliteration for Arabic.`
    : "";
  return `Translate the following text to ${target}.${latinNote} Output only the translation, no quotes, no explanation.\n\n${text}`;
}

import { createServerFn } from "@tanstack/react-start";

export type TranscribeInput = {
  base64: string;
  mime: string;
  filename?: string;
  keyterms?: string[];
};

export type TranscribeOutput =
  | { ok: true; text: string; duration: number }
  | { ok: false; error: string };

const MAX_B64 = 3_500_000;
const KEYTERMS = [
  "LivinSync",
  "ferritin",
  "peptide",
  "BPC-157",
  "BPC",
  "UltraHuman",
  "Anaya",
  "Malhotra",
  "Yoga Nidra",
  "nidra",
  "magnesium",
  "queue",
  "BSES",
  "house help",
  "taken",
  "gym",
  "deep work",
  "tesamorelin",
  "Dr Shah",
];

function stripBase64(raw: string) {
  const s = raw.trim();
  const i = s.indexOf("base64,");
  return i >= 0 ? s.slice(i + 7) : s;
}

function extFor(mime: string, filename?: string) {
  const fromName = filename?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime.includes("wav")) return "wav";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("opus")) return "ogg";
  return "webm";
}

function mergeKeyterms(extra: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...KEYTERMS, ...extra]) {
    const v = t.trim().slice(0, 50);
    const k = v.toLowerCase();
    if (v.length < 2 || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= 80) break;
  }
  return out;
}

async function postStt(
  apiKey: string,
  bytes: Buffer,
  mime: string,
  filename: string,
  keyterms: string[],
  vad: boolean,
) {
  const form = new FormData();
  form.append("format", "true");
  form.append("language", "en");
  form.append("filler_words", "false");
  if (vad) form.append("vad_threshold", "0.35");
  for (const term of keyterms) form.append("keyterm", term);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  form.append("file", new Blob([copy], { type: mime || "application/octet-stream" }), filename);

  return fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
}

export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((input: TranscribeInput) => ({
    base64: stripBase64(String(input.base64 ?? "")).slice(0, MAX_B64),
    mime: String(input.mime ?? "audio/webm").slice(0, 80),
    filename: String(input.filename ?? "voice").slice(0, 180),
    keyterms: (input.keyterms ?? []).slice(0, 40).map((t) => String(t).slice(0, 50)),
  }))
  .handler(async ({ data }): Promise<TranscribeOutput> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "Transcription isn’t available in this environment." };
    if (data.base64.length < 80) return { ok: false, error: "Recording was empty." };

    let bytes: Buffer;
    try {
      bytes = Buffer.from(data.base64, "base64");
    } catch {
      return { ok: false, error: "Couldn’t read the audio." };
    }
    if (bytes.byteLength < 64) return { ok: false, error: "Recording was empty." };

    const filename = data.filename.includes(".")
      ? data.filename
      : `${data.filename}.${extFor(data.mime, data.filename)}`;
    const keyterms = mergeKeyterms(data.keyterms);

    try {
      let res = await postStt(apiKey, bytes, data.mime, filename, keyterms, true);
      if (!res.ok && (res.status === 400 || res.status === 422)) {
        res = await postStt(apiKey, bytes, data.mime, filename, keyterms, false);
      } else if (!res.ok && res.status >= 500) {
        res = await postStt(apiKey, bytes, data.mime, filename, keyterms, true);
      }
      if (!res.ok) {
        return { ok: false, error: `Transcription failed (${res.status}).` };
      }
      const body = (await res.json()) as { text?: string; duration?: number };
      const text = (body.text ?? "").trim();
      if (!text) return { ok: false, error: "No speech detected." };
      return { ok: true, text: text.slice(0, 4000), duration: Number(body.duration) || 0 };
    } catch {
      return { ok: false, error: "Transcription timed out." };
    }
  });

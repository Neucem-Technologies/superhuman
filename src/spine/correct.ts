import { BUILTIN_SHORTCUTS } from "./commands";
import type { Domain } from "./types";

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(s: string) {
  return norm(s).replace(/ /g, "");
}

function distance(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = new Uint16Array(n + 1);
  const cur = new Uint16Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev.set(cur);
  }
  return prev[n]!;
}

function similar(a: string, b: string) {
  const ca = compact(a);
  const cb = compact(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  const d = distance(ca, cb);
  const max = Math.max(ca.length, cb.length);
  if (d <= 1 && max >= 3) return true;
  return max >= 5 && d / max <= 0.32;
}

/** Spoken mishears → canonical LivinSync terms. */
const SWAPS: [RegExp, string][] = [
  [/\b(yoga\s+)?(need\s*raw|needra|nindra|nidrah|knee\s*draw|need\s*ra)\b/gi, "nidra"],
  [/\byoga\s+nidra\b/gi, "nidra"],
  [/\b(bbc|be\s*p\s*c|bee\s*p\s*c|b\s*p\s*c|vpc)\b/gi, "bpc"],
  [/\bbpc[\s-]*1\s*5\s*7\b/gi, "bpc"],
  [/\bbpc[\s-]*one\s+fifty\s+seven\b/gi, "bpc"],
  [/\b(cue|que)\b/gi, "queue"],
  [/\b(dee\s*three|d\s*three|d-3|vitamin\s+dee)\b/gi, "d3"],
  [/\b(takin|take\s*in|i\s+take\s+it)\b/gi, "taken"],
  [/\b(magnesum|magneesium|magneesium)\b/gi, "magnesium"],
  [/\b(feratin|ferratin|faritin|feritin)\b/gi, "ferritin"],
  [/\b(ultra\s*human|ultrahumen)\b/gi, "UltraHuman"],
  [/\b(brief\s*in)\b/gi, "briefing"],
  [/\bjim\b/gi, "gym"],
  [/\b(deep\s+work|deepwork)\b/gi, "deep work"],
];

function phraseBank(state: Domain) {
  const out: string[] = BUILTIN_SHORTCUTS.map((s) => s.phrase);
  for (const s of state.shortcuts ?? []) out.push(s.phrase);
  for (const a of state.adherence) {
    out.push(a.name);
    if (a.id === "adh-bpc") out.push("bpc");
    if (a.id === "adh-mag") out.push("mag");
    if (a.id === "adh-d") out.push("d3");
  }
  return out;
}

export function sttKeyterms(state: Domain): string[] {
  const terms = new Set<string>([
    "LivinSync",
    "Yoga Nidra",
    "nidra",
    "BPC-157",
    "BPC",
    "ferritin",
    "UltraHuman",
    "magnesium",
    "queue",
    "BSES",
    "house help",
    "taken",
    "deep work",
    "Anaya",
    "Malhotra",
    "peptide",
  ]);
  for (const p of phraseBank(state)) terms.add(p);
  for (const b of state.bills ?? []) terms.add(b.name);
  return [...terms]
    .map((t) => t.trim().slice(0, 50))
    .filter((t) => t.length >= 2)
    .slice(0, 60);
}

export function correctTranscript(raw: string, state: Domain): string {
  let t = raw.trim();
  if (!t) return t;
  for (const [re, to] of SWAPS) t = t.replace(re, to);
  t = t.replace(/\s+/g, " ").trim();

  const phrases = phraseBank(state);
  const words = t.split(" ");
  const mapped = words.map((w) => {
    const hit = phrases.find((p) => similar(w, p) && compact(p).length >= 3);
    return hit ?? w;
  });
  t = mapped.join(" ");

  const n = norm(t);
  if (n.split(" ").length <= 4) {
    const hit = phrases.find((p) => similar(n, p));
    if (hit) return hit;
  }
  return t;
}

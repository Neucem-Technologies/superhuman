import { ALL_TABS, TAB_LABELS, type ExchangeChannel, type PendingFile, type TabId } from "./types";

export const TAB_FOLDER: Record<TabId, string> = {
  home: "Inbox",
  work: "Work",
  growth: "Growth",
  travel: "Travel",
  health: "Health",
  entertainment: "Entertainment",
  shopping: "Shopping",
  notes: "Notes",
  files: "Inbox",
  finance: "Finance",
  businesses: "Businesses",
};

const RULES: { tab: TabId; re: RegExp }[] = [
  { tab: "health", re: /\b(sleep|hrv|rhr|ferritin|peptide|bpc|workout|doctor|lab|blood|prescription|anxiety|mood|energy|supplement|vial|recovery|strain|apple health|ultrahuman|insulin|thyroid|meds?|dose)\b/i },
  { tab: "finance", re: /\b(invoice|gst|bill|salary|loan|rupee|₹|hdfc|upi|cashflow|tax|emi|checking|savings|paid|owing)\b/i },
  { tab: "travel", re: /\b(flight|trip|pack|hotel|boarding|itinerary|gokarna|bangalore|bengaluru|goa|del-|airport|visa|suitcase)\b/i },
  { tab: "work", re: /\b(meeting|calendar|email|inbox|task|deadline|vendor|deep work|agenda|forecast|q3|standup|slack|client call)\b/i },
  { tab: "businesses", re: /\b(campaign|cpl|ads?|retainer|northwind|saffron|malhotra media|client roster|impressions)\b/i },
  { tab: "shopping", re: /\b(grocery|buy|amazon|bigbasket|cart|order|kef|speaker|price watch|protocol item)\b/i },
  { tab: "growth", re: /\b(podcast|yoga|nidra|meditat|book|marcus|spiritual|hobby|film photo|huberman|streak|reading)\b/i },
  { tab: "entertainment", re: /\b(movie|show|netflix|spotify|playlist|the bear|watch|concert|dinner out|khan market)\b/i },
  { tab: "files", re: /\b(folder|pdf|document|upload|scan|file this|keep this copy)\b/i },
  { tab: "notes", re: /\b(note|remember|idea|jot|memo|capture)\b/i },
];

export type ClassifyInput = {
  query: string;
  channel: ExchangeChannel;
  files?: PendingFile[];
};

export type ClassifyResult = {
  tab: TabId;
  title: string;
  response: string;
  folderName: string;
  sideEffectKind: "none" | "task" | "note" | "reminder";
  sideEffectTitle: string;
  source: "local" | "grok";
};

function blob(input: ClassifyInput) {
  const names = (input.files ?? []).map((f) => `${f.name} ${f.mime} ${f.textExcerpt ?? ""}`).join(" ");
  return `${input.query} ${names}`.trim();
}

export function classifyLocal(input: ClassifyInput): ClassifyResult {
  const text = blob(input);
  let best: TabId = input.files?.length && !input.query.trim() ? "files" : "notes";
  let score = 0;
  for (const rule of RULES) {
    const m = text.match(rule.re);
    const n = m ? 1 + (m.length > 1 ? 1 : 0) : 0;
    if (n > score) {
      score = n;
      best = rule.tab;
    }
  }
  if (/\b(brief|today|across|livinsync|superhuman|overview)\b/i.test(input.query) && score < 2) best = "home";

  const firstFile = input.files?.[0]?.name;
  const title =
    (input.query.trim().slice(0, 56) || firstFile || "Capture").replace(/\s+/g, " ").trim();

  const fileLine = input.files?.length
    ? ` Stored ${input.files.map((f) => f.name).join(", ")} in Files → ${TAB_FOLDER[best]}.`
    : "";

  const sideEffectKind: ClassifyResult["sideEffectKind"] = /\b(todo|task|remind me to|add a task)\b/i.test(input.query)
    ? "task"
    : /\b(remind me|reminder|ping me)\b/i.test(input.query)
      ? "reminder"
      : /\b(note this|save a note|jot)\b/i.test(input.query)
        ? "note"
        : "none";

  return {
    tab: ALL_TABS.includes(best) ? best : "notes",
    title,
    response: `Filed to ${TAB_LABELS[best]}.${fileLine} Ask again anytime — each exchange stays with that tab.`,
    folderName: TAB_FOLDER[best],
    sideEffectKind,
    sideEffectTitle: sideEffectKind === "none" ? "" : title,
    source: "local",
  };
}

export function isTabId(v: string): v is TabId {
  return (ALL_TABS as string[]).includes(v);
}

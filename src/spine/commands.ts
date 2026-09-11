import { at } from "./format";
import { ALL_TABS, SELF_ID, TAB_LABELS, type Domain, type TabId } from "./types";

export type ParsedCommand = {
  type: string;
  payload: Record<string, unknown>;
  tab: TabId;
  title: string;
  reply: string;
  navigate: boolean;
};

export type ShortcutChip = {
  phrase: string;
  hint: string;
  custom?: boolean;
};

export const BUILTIN_SHORTCUTS: { phrase: string; command: string; hint: string }[] = [
  { phrase: "taken", command: "", hint: "Log next protocol item" },
  { phrase: "bpc", command: "I took BPC", hint: "Log BPC-157" },
  { phrase: "mag", command: "I took magnesium", hint: "Log magnesium" },
  { phrase: "d3", command: "I took vitamin D", hint: "Log vitamin D" },
  { phrase: "nidra", command: "Place yoga nidra on the calendar", hint: "Book the 10-min reset" },
  { phrase: "reset", command: "Place yoga nidra on the calendar", hint: "Book the 10-min reset" },
  { phrase: "queue", command: "Queue the bill", hint: "Queue the next due bill" },
  { phrase: "bill", command: "Queue the bill", hint: "Queue the next due bill" },
  { phrase: "deep", command: "Block deep work", hint: "Block 10:00–12:00" },
  { phrase: "focus", command: "Block deep work", hint: "Block 10:00–12:00" },
  { phrase: "briefing", command: "What's on today", hint: "Open Home" },
  { phrase: "yes", command: "", hint: "Accept the top suggestion" },
];

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesName(hay: string, name: string) {
  const h = norm(hay);
  const n = norm(name);
  if (!n) return false;
  if (h.includes(n)) return true;
  const parts = n.split(" ").filter((w) => w.length > 2);
  return parts.length > 0 && parts.every((w) => h.includes(w));
}

function best<T>(items: T[], text: string, names: (item: T) => string[]) {
  let hit: T | undefined;
  let score = 0;
  for (const item of items) {
    for (const name of names(item)) {
      const n = norm(name);
      if (!n) continue;
      const s = norm(text).includes(n) ? n.length + 10 : includesName(text, name) ? n.length : 0;
      if (s > score) {
        score = s;
        hit = item;
      }
    }
  }
  return hit;
}

const TAB_ALIASES: Record<string, TabId> = {
  home: "home",
  briefing: "home",
  today: "home",
  work: "work",
  calendar: "work",
  inbox: "work",
  growth: "growth",
  travel: "travel",
  trip: "travel",
  health: "health",
  protocol: "health",
  entertainment: "entertainment",
  watch: "entertainment",
  shopping: "shopping",
  shop: "shopping",
  groceries: "shopping",
  notes: "notes",
  files: "files",
  finance: "finance",
  money: "finance",
  bills: "finance",
  businesses: "businesses",
  business: "businesses",
  biz: "businesses",
};

function tabFromSpeech(text: string): TabId | null {
  const n = norm(text);
  for (const [alias, tab] of Object.entries(TAB_ALIASES)) {
    if (n === alias || n.endsWith(` ${alias}`) || n.includes(` ${alias} tab`) || n.includes(` ${alias} please`)) {
      return tab;
    }
  }
  for (const tab of ALL_TABS) {
    if (n.includes(norm(TAB_LABELS[tab]))) return tab;
  }
  return null;
}

function parseTime(text: string): { h: number; m: number } | null {
  const m = text.match(/\b(?:at|for)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = (m[3] ?? "").toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (!ap && h <= 7) h += 12;
  return { h, m: min };
}

function expandShortcut(n: string, state: Domain): string | null {
  const custom = (state.shortcuts ?? []).find((s) => norm(s.phrase) === n);
  if (custom?.command) return custom.command;
  const builtin = BUILTIN_SHORTCUTS.find((s) => s.phrase === n);
  if (!builtin) return null;
  if (builtin.phrase === "taken") {
    const item = state.adherence.find((a) => !a.taken);
    return item ? `I took ${item.name}` : null;
  }
  if (builtin.phrase === "yes") return null;
  return builtin.command || null;
}

function pendingAlias(item: Domain["adherence"][number]) {
  if (item.id === "adh-bpc") return "bpc";
  if (item.id === "adh-mag") return "mag";
  if (item.id === "adh-d") return "d3";
  if (item.id === "adh-omega") return "omega";
  return "taken";
}

export function visibleShortcuts(state: Domain): ShortcutChip[] {
  const out: ShortcutChip[] = [];
  const seen = new Set<string>();
  const push = (chip: ShortcutChip) => {
    const k = norm(chip.phrase);
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push(chip);
  };

  const pending = state.adherence.find((a) => !a.taken);
  if (pending) push({ phrase: pendingAlias(pending), hint: `Log ${pending.name}` });
  if (state.suggestions.some((s) => s.id === "sugg-meditate" || /nidra|meditat/i.test(s.title))) {
    push({ phrase: "nidra", hint: "Place Yoga Nidra" });
  }
  if (state.suggestions[0]) push({ phrase: "yes", hint: state.suggestions[0].actions[0]?.label ?? "Accept suggestion" });
  const due = state.bills.find((b) => b.status === "due");
  if (due) push({ phrase: "queue", hint: `Queue ${due.name}` });
  for (const s of state.shortcuts ?? []) push({ phrase: s.phrase, hint: s.command, custom: true });
  return out.slice(0, 6);
}

export function parseCommands(raw: string, state: Domain, depth = 0): ParsedCommand[] {
  const text = raw.trim();
  if (!text) return [];
  let n = norm(text);

  const woke = n.match(/^(hey livinsync|ok livinsync|hey superhuman|ok superhuman|hey|shortcut|run) (.+)$/);
  if (woke?.[2] && depth < 3) {
    return parseCommands(woke[2], state, depth + 1);
  }

  if (depth < 3) {
    const expanded = expandShortcut(n, state);
    if (expanded && norm(expanded) !== n) {
      return parseCommands(expanded, state, depth + 1);
    }
  }

  if (/^(yes|ok|okay|do it|go ahead)$/.test(n)) {
    const sugg = state.suggestions[0];
    const action = sugg?.actions[0];
    if (action) {
      return [
        {
          type: action.eventType,
          payload: action.payload,
          tab: sugg.source_tabs[0] ?? "home",
          title: sugg.title,
          reply: action.label,
          navigate: true,
        },
      ];
    }
  }

  const nav = n.match(/^(open|go to|show me|show|switch to|take me to|jump to)(?: the)? (.+)$/);
  if (nav) {
    const tab = tabFromSpeech(nav[2] ?? "") ?? (/\btoday\b|\bbriefing\b/.test(n) ? "home" : null);
    if (tab) {
      return [
        {
          type: "ui.tab",
          payload: { tab },
          tab,
          title: `Open ${TAB_LABELS[tab]}`,
          reply: `Opened ${TAB_LABELS[tab]}.`,
          navigate: true,
        },
      ];
    }
  }
  if (/^(what'?s on today|today'?s briefing|show (me )?today)\b/.test(n)) {
    return [
      {
        type: "ui.tab",
        payload: { tab: "home" },
        tab: "home",
        title: "Briefing",
        reply: "Opened today’s briefing.",
        navigate: true,
      },
    ];
  }

  const takenVerb = /\b(i (just |already )?)?(took|taken|logged)\b|\blog my\b|\bmark\b.+\btaken\b|\bdid my\b/.test(n);
  if (takenVerb) {
    const pending = state.adherence.filter((a) => !a.taken);
    const all = /\b(everything|all of them|all my (meds|supplements|peptides))\b/.test(n);
    const kind = /\bpeptides?\b/.test(n) ? "peptide" : /\bsupplements?\b/.test(n) ? "supplement" : null;
    let items = pending;
    if (!all) {
      const named = best(pending.length ? pending : state.adherence, text, (a) => {
        const extra =
          a.id === "adh-bpc" ? ["bpc", "bpc 157", "bpc157", "peptide"] : a.id === "adh-d" ? ["d3", "vitamin d", "vit d"] : a.id === "adh-mag" ? ["magnesium", "mag"] : a.id === "adh-omega" ? ["omega", "fish oil"] : [];
        return [a.name, ...extra];
      });
      items = named ? [named] : kind ? pending.filter((a) => a.kind === kind) : [];
    }
    items = items.filter((a) => !a.taken);
    if (items.length) {
      return items.map((item) => ({
        type: "health.adherence.log",
        payload: { itemId: item.id, taken: true },
        tab: "health" as TabId,
        title: `Taken · ${item.name}`,
        reply: `Logged ${item.name}.`,
        navigate: true,
      }));
    }
  }

  if (/\b(place|put|schedule|book|add|accept|confirm)\b/.test(n) && /\b(meditat|nidra|reset|10 min|ten min|10-minute)\b/.test(n)) {
    const already = state.calendar.some((c) => /meditation|nidra/i.test(c.title) && c.status !== "declined");
    if (already) {
      return [
        {
          type: "ui.tab",
          payload: { tab: "work" },
          tab: "work",
          title: "Yoga Nidra",
          reply: "Yoga Nidra is already on the calendar.",
          navigate: true,
        },
      ];
    }
    const sugg = state.suggestions.find((s) => s.id === "sugg-meditate" || /nidra|meditat|reset/i.test(`${s.title} ${s.body}`));
    const action = sugg?.actions[0];
    const t = parseTime(text);
    if (action) {
      return [
        {
          type: action.eventType,
          payload: t
            ? { ...action.payload, start: at(t.h, t.m), end: at(t.h, t.m + 10) }
            : action.payload,
          tab: "work",
          title: "Yoga Nidra",
          reply: "Placed 10-min Yoga Nidra on the calendar.",
          navigate: true,
        },
      ];
    }
    const start = t ? at(t.h, t.m) : at(13, 40);
    return [
      {
        type: "work.calendar.propose",
        payload: {
          title: "10-min Yoga Nidra",
          start,
          end: start + 10 * 60_000,
          kind: "health",
          ownerId: SELF_ID,
          confirmed: true,
        },
        tab: "work",
        title: "Yoga Nidra",
        reply: "Placed 10-min Yoga Nidra on the calendar.",
        navigate: true,
      },
    ];
  }

  if (/\b(queue|pay)\b/.test(n) && /\b(bill|electric|bses|house help|salary|jio|fiber|maid|help)\b/.test(n)) {
    const due = state.bills.filter((b) => b.status === "due" || b.status === "queued");
    const bill =
      best(due.length ? due : state.bills, text, (b) => {
        const extra =
          b.id === "bill-electric"
            ? ["electricity", "electric", "bses", "power"]
            : b.id === "bill-help"
              ? ["house help", "help salary", "maid"]
              : b.id === "bill-phone"
                ? ["jio", "fiber", "phone"]
                : [];
        return [b.name, ...extra];
      }) ?? due[0];
    if (bill) {
      const pay = /\bpay\b/.test(n) && !/\bqueue\b/.test(n);
      return [
        {
          type: pay ? "finance.bill.pay" : "finance.bill.queue",
          payload: { id: bill.id },
          tab: "finance",
          title: pay ? `Paid · ${bill.name}` : `Queued · ${bill.name}`,
          reply: pay ? `Marked ${bill.name} paid.` : `Queued ${bill.name} for pay.`,
          navigate: true,
        },
      ];
    }
  }

  if (/\b(buy|purchase|order)\b/.test(n)) {
    const item = best(state.research, text, (r) => {
      const extra = /kef|speaker|stereo|lsx/i.test(r.name) ? ["kef", "speakers", "stereo"] : /iron/i.test(r.name) ? ["iron"] : [];
      return [r.name, r.category, ...extra];
    });
    if (item) {
      return [
        {
          type: "shop.buy",
          payload: { researchId: item.id, addToProtocol: item.relevantToHealth },
          tab: "shopping",
          title: `Buy · ${item.name}`,
          reply: `Bought ${item.name}.`,
          navigate: true,
        },
      ];
    }
  }

  if (/\b(check off|got|bought|tick|packed|pack)\b/.test(n)) {
    for (const list of state.lists) {
      const item = best(
        list.items.filter((i) => !i.checked),
        text,
        (i) => [i.name],
      );
      if (item) {
        return [
          {
            type: "shop.item.toggle",
            payload: { listId: list.id, itemId: item.id },
            tab: "shopping",
            title: `${item.name} · ${list.name}`,
            reply: `Checked off ${item.name}.`,
            navigate: true,
          },
        ];
      }
    }
  }

  const task = text.match(/^(?:add|create|make|new)\s+(?:a\s+)?(?:task|to-?do)\s+(?:to\s+|for\s+)?(.+)/i);
  if (task?.[1]) {
    const title = task[1].replace(/\.$/, "").trim();
    return [
      {
        type: "work.task.add",
        payload: { title, ownerId: SELF_ID },
        tab: "work",
        title,
        reply: `Task added: ${title}.`,
        navigate: true,
      },
    ];
  }

  const remind = text.match(/^remind me to\s+(.+)/i);
  if (remind?.[1] && !/^what|^when|^if|^whether/i.test(remind[1])) {
    const title = remind[1].replace(/\.$/, "").trim();
    return [
      {
        type: "work.reminder.add",
        payload: { title, ownerId: SELF_ID, when: Date.now() + 2 * 3600_000 },
        tab: "work",
        title,
        reply: `Reminder set: ${title}.`,
        navigate: true,
      },
    ];
  }

  const note = text.match(/^(?:note this|jot this down|save a note|make a note)[:\s]+(.+)/i);
  if (note?.[1]) {
    const body = note[1].trim();
    return [
      {
        type: "notes.save",
        payload: { title: body.slice(0, 48), body },
        tab: "notes",
        title: body.slice(0, 48),
        reply: "Saved to Notes.",
        navigate: true,
      },
    ];
  }

  if (/\b(block|schedule|hold)\b/.test(n) && /\b(deep work|focus (block|time))\b/.test(n)) {
    return [
      {
        type: "work.calendar.propose",
        payload: {
          title: "Deep work",
          start: at(10, 0),
          end: at(12, 0),
          kind: "focus",
          ownerId: SELF_ID,
          confirmed: true,
          deepWork: true,
        },
        tab: "work",
        title: "Deep work",
        reply: "Blocked 10:00–12:00 for deep work.",
        navigate: true,
      },
    ];
  }

  if (/\b(accept|confirm)\b/.test(n) && /\b(invite|calendar|meeting)\b/.test(n)) {
    const pending = state.calendar.find((c) => c.status === "pending" && c.ownerId === SELF_ID);
    if (pending) {
      return [
        {
          type: "work.calendar.accept",
          payload: { id: pending.id },
          tab: "work",
          title: pending.title,
          reply: `Accepted ${pending.title}.`,
          navigate: true,
        },
      ];
    }
  }

  return [];
}

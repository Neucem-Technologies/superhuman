/**
 * SUPERHUMAN architecture
 * -----------------------
 * Modular monolith. Modules (Work, Health, Growth, Travel, …) never import
 * each other. The timeline event store is the only cross-module contract:
 *   { id, type, timestamp, source_tab, actor_id, payload JSON, links[] }
 * The rules engine + bot read the timeline (and the domain snapshot it
 * projects) and produce suggestions, nudges, and cross-tab actions.
 * Identity, notification bus, and permissions live in the spine.
 * Every write is tagged with the acting contributor.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid, str, num, bool } from "@/lib/utils";
import { mockSearch } from "@/mocks";
import { at, todayKey } from "./format";
import { canAct, tabFromType, visibleTabs } from "./permissions";
import { evaluateRules, notificationsForEvent } from "./rules";
import { buildSeed } from "./seed";
import { calcPeptide } from "./peptide";
import { asPendingFiles, dataUrlBudgetUsed, resolveFolderId } from "./vault";
import { SELF_ID, type Access, type CircleId, type ConnectorId, type Domain, type ExchangeChannel, type HomeLayout, type InviteChannel, type Person, type TabId, type TimelineEvent, type WidgetPref } from "./types";
import { defaultWidgets, mergeWidgets } from "./widgets";
import { applyConnectorImport, catalogOf, defaultConnectors, mergeConnectors } from "./connectors";

function normPhrase(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim();
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function asPersonScopes(v: unknown): Person["scopes"] {
  if (!Array.isArray(v)) return undefined;
  const out: NonNullable<Person["scopes"]> = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.tab !== "string") continue;
    const access = rec.access === "admin" || rec.access === "view" ? rec.access : "edit";
    const healthFilter = rec.healthFilter === "workout" || rec.healthFilter === "full" ? rec.healthFilter : undefined;
    out.push({ tab: rec.tab as TabId, access: access as Access, healthFilter });
  }
  return out.length ? out : undefined;
}

export type AppState = Domain & {
  actorId: string;
  activeTab: TabId;
  act: (type: string, payload?: Record<string, unknown>, links?: string[]) => { ok: boolean; error?: string };
  setActor: (id: string) => void;
  setTab: (tab: TabId) => void;
  setHomeLayout: (layout: HomeLayout) => void;
  setWidgets: (widgets: WidgetPref[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function apply(state: AppState, event: TimelineEvent): AppState {
  const p = event.payload;
  let s: AppState = state;
  if (!s.exchanges) s = { ...s, exchanges: [] };
  if (!s.folders) s = { ...s, folders: [] };
  if (!s.files) s = { ...s, files: [] };
  if (!s.shortcuts) s = { ...s, shortcuts: [] };
  if (!s.homeLayout) s = { ...s, homeLayout: "board" };
  if (!s.widgets) s = { ...s, widgets: defaultWidgets() };
  if (!s.connectors) s = { ...s, connectors: defaultConnectors() };
  else s = { ...s, connectors: mergeConnectors(s.connectors) };
  if (!s.waThreads) s = { ...s, waThreads: [] };
  if (!s.diet) s = { ...s, diet: [] };

  switch (event.type) {
    case "health.adherence.log": {
      const id = str(p, "itemId");
      const taken = bool(p, "taken", true);
      s = {
        ...s,
        adherence: s.adherence.map((a) =>
          a.id === id ? { ...a, taken, missed: !taken } : a,
        ),
      };
      const item = s.adherence.find((a) => a.id === id);
      if (item?.vialId) {
        const day = todayKey();
        s = {
          ...s,
          vials: s.vials.map((v) =>
            v.id === item.vialId
              ? {
                  ...v,
                  history: v.history.some((h) => h.date === day)
                    ? v.history.map((h) => (h.date === day ? { ...h, taken } : h))
                    : [...v.history, { date: day, taken }],
                }
              : v,
          ),
        };
      }
      s = {
        ...s,
        notifications: s.notifications.map((n) =>
          n.kind === "adherence" && !n.read ? { ...n, read: true } : n,
        ),
      };
      break;
    }
    case "health.peptide.save": {
      const id = str(p, "id", s.vials[0]?.id ?? uid("vial"));
      const patch = {
        powderMg: num(p, "powderMg", 5),
        vialVolumeMl: num(p, "vialVolumeMl", 2),
        syringeVolumeMl: num(p, "syringeVolumeMl", 1),
        syringeUnits: num(p, "syringeUnits", 100),
        targetDoseMcg: num(p, "targetDoseMcg", 250),
        premixedConcentrationMcgPerMl: p.premixedConcentrationMcgPerMl
          ? num(p, "premixedConcentrationMcgPerMl")
          : undefined,
      };
      s = {
        ...s,
        vials: s.vials.some((v) => v.id === id)
          ? s.vials.map((v) => (v.id === id ? { ...v, ...patch } : v))
          : [
              ...s.vials,
              {
                id,
                name: str(p, "name", "Peptide"),
                startDate: Date.now(),
                history: [],
                ...patch,
              },
            ],
      };
      const vial = s.vials.find((v) => v.id === id);
      if (vial) {
        const r = calcPeptide(vial, vial.history.filter((h) => h.taken).length);
        const dose = `${vial.targetDoseMcg} mcg · ${r.unitsToDraw.toFixed(0)} units`;
        const existing = s.adherence.find((a) => a.vialId === id);
        if (existing) {
          s = { ...s, adherence: s.adherence.map((a) => (a.id === existing.id ? { ...a, dose } : a)) };
        }
      }
      break;
    }
    case "health.checkin.save": {
      const row = {
        date: todayKey(),
        mood: num(p, "mood", 3),
        energy: num(p, "energy", 3),
        anxiety: num(p, "anxiety", 3),
        sleepHours: num(p, "sleepHours", 7),
        stress: num(p, "stress", 3),
        notes: str(p, "notes") || undefined,
      };
      s = { ...s, checkins: [row, ...s.checkins.filter((c) => c.date !== row.date)] };
      break;
    }
    case "health.workout.save": {
      s = {
        ...s,
        workout: {
          ...s.workout,
          notes: str(p, "notes", s.workout.notes),
          title: str(p, "title", s.workout.title),
        },
      };
      if (!s.reminders.some((r) => r.id === "rem-wo-live")) {
        const rem = {
          id: "rem-wo-live",
          title: "Workout · " + s.workout.days[0]?.focus,
          when: at(18, 45, 1),
          ownerId: SELF_ID,
          createdBy: event.actor_id,
          fired: false,
        };
        s = { ...s, reminders: [rem, ...s.reminders] };
      }
      break;
    }
    case "health.note.add": {
      const rec = {
        id: uid("rec"),
        kind: "note" as const,
        title: str(p, "title", "Clinical note"),
        date: Date.now(),
        summary: str(p, "summary"),
        authorId: event.actor_id,
      };
      s = { ...s, records: [rec, ...s.records] };
      break;
    }
    case "health.measurement.add": {
      s = {
        ...s,
        metrics: [
          {
            date: todayKey(),
            weightKg: num(p, "weightKg"),
            waistCm: p.waistCm ? num(p, "waistCm") : undefined,
          },
          ...s.metrics,
        ],
      };
      break;
    }
    case "work.task.add": {
      s = {
        ...s,
        tasks: [
          {
            id: uid("task"),
            title: str(p, "title"),
            done: false,
            ownerId: str(p, "ownerId", SELF_ID),
            createdBy: event.actor_id,
            priority: 2,
            tiny: bool(p, "tiny"),
          },
          ...s.tasks,
        ],
      };
      break;
    }
    case "work.task.toggle": {
      const id = str(p, "id");
      s = { ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) };
      break;
    }
    case "work.reminder.add": {
      s = {
        ...s,
        reminders: [
          {
            id: uid("rem"),
            title: str(p, "title"),
            when: num(p, "when", Date.now() + 3600_000),
            ownerId: str(p, "ownerId", SELF_ID),
            createdBy: event.actor_id,
            fired: false,
          },
          ...s.reminders,
        ],
      };
      break;
    }
    case "work.calendar.propose": {
      const confirmed = bool(p, "confirmed") || event.actor_id === str(p, "ownerId", SELF_ID);
      s = {
        ...s,
        calendar: [
          {
            id: uid("cal"),
            title: str(p, "title"),
            start: num(p, "start"),
            end: num(p, "end"),
            ownerId: str(p, "ownerId", SELF_ID),
            kind: (str(p, "kind", "meeting") as AppState["calendar"][number]["kind"]) || "meeting",
            status: confirmed ? "confirmed" : "pending",
            invitedBy: confirmed ? undefined : event.actor_id,
          },
          ...s.calendar,
        ],
      };
      break;
    }
    case "work.calendar.accept": {
      const id = str(p, "id");
      s = {
        ...s,
        calendar: s.calendar.map((c) => (c.id === id ? { ...c, status: "confirmed" } : c)),
        notifications: s.notifications.map((n) =>
          n.action?.payload.id === id ? { ...n, read: true } : n,
        ),
      };
      break;
    }
    case "work.calendar.decline": {
      const id = str(p, "id");
      s = { ...s, calendar: s.calendar.map((c) => (c.id === id ? { ...c, status: "declined" } : c)) };
      break;
    }
    case "work.calendar.delete": {
      const id = str(p, "id");
      s = { ...s, calendar: s.calendar.filter((c) => c.id !== id) };
      break;
    }
    case "work.calendar.reschedule": {
      const id = str(p, "id");
      s = {
        ...s,
        calendar: s.calendar.map((c) =>
          c.id === id ? { ...c, start: num(p, "start", c.start), end: num(p, "end", c.end) } : c,
        ),
      };
      break;
    }
    case "work.email.read": {
      const id = str(p, "id");
      s = { ...s, emails: s.emails.map((e) => (e.id === id ? { ...e, unread: false } : e)) };
      break;
    }
    case "growth.chat": {
      const text = str(p, "text");
      const results = mockSearch(text);
      const userMsg = { id: uid("ch"), role: "user" as const, text, timestamp: event.timestamp };
      const botMsg = {
        id: uid("ch"),
        role: "bot" as const,
        text: `Logged to the timeline. ${results[0]?.title ?? "Nothing in subscriptions matched tightly."}`,
        timestamp: event.timestamp + 1,
        results,
      };
      s = { ...s, chat: [...s.chat, userMsg, botMsg] };
      break;
    }
    case "growth.checkin": {
      const id = str(p, "id");
      s = {
        ...s,
        growth: s.growth.map((g) =>
          g.id === id ? { ...g, streak: g.streak + 1, lastDone: todayKey() } : g,
        ),
      };
      break;
    }
    case "shop.item.toggle": {
      const listId = str(p, "listId");
      const itemId = str(p, "itemId");
      s = {
        ...s,
        lists: s.lists.map((l) =>
          l.id === listId
            ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)) }
            : l,
        ),
      };
      break;
    }
    case "shop.item.add": {
      const listId = str(p, "listId");
      s = {
        ...s,
        lists: s.lists.map((l) =>
          l.id === listId
            ? {
                ...l,
                items: [
                  {
                    id: uid("gi"),
                    name: str(p, "name"),
                    qty: str(p, "qty", "1"),
                    ownerId: event.actor_id,
                    checked: false,
                    fromProtocol: bool(p, "fromProtocol"),
                    fromTravel: bool(p, "fromTravel"),
                  },
                  ...l.items,
                ],
              }
            : l,
        ),
      };
      break;
    }
    case "shop.item.remove": {
      const listId = str(p, "listId");
      const itemId = str(p, "itemId");
      s = {
        ...s,
        lists: s.lists.map((l) =>
          l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l,
        ),
      };
      break;
    }
    case "shop.buy": {
      const researchId = str(p, "researchId");
      const item = s.research.find((r) => r.id === researchId);
      if (item) {
        const inv = {
          id: uid("inv"),
          name: item.name,
          qty: 1,
          purchasedAt: event.timestamp,
          fromVaultId: item.id,
          healthProtocol: bool(p, "addToProtocol") || item.relevantToHealth,
        };
        s = {
          ...s,
          inventory: [inv, ...s.inventory],
          research: s.research.filter((r) => r.id !== researchId),
          accounts: s.accounts.map((a) =>
            a.id === "acc-check" ? { ...a, balanceInr: a.balanceInr - item.priceInr } : a,
          ),
        };
        if (inv.healthProtocol) {
          s = {
            ...s,
            lists: s.lists.map((l) =>
              l.id === "list-groc"
                ? {
                    ...l,
                    items: [
                      {
                        id: uid("gi"),
                        name: item.name,
                        qty: "protocol",
                        ownerId: SELF_ID,
                        checked: false,
                        fromProtocol: true,
                      },
                      ...l.items,
                    ],
                  }
                : l,
            ),
          };
        }
      }
      break;
    }
    case "travel.commit": {
      const id = str(p, "id");
      s = {
        ...s,
        trips: s.trips.map((t) => (t.id === id ? { ...t, status: "committed" } : t)),
      };
      break;
    }
    case "travel.watch": {
      const id = str(p, "id");
      s = { ...s, trips: s.trips.map((t) => (t.id === id ? { ...t, status: "watching" } : t)) };
      break;
    }
    case "travel.personal.save": {
      s = {
        ...s,
        trips: [
          {
            id: uid("trip"),
            mode: "personal",
            title: str(p, "title", "Personal trip"),
            destination: str(p, "destination") || undefined,
            vibe: str(p, "vibe") || undefined,
            companions: str(p, "companions") || undefined,
            season: str(p, "season") || undefined,
            budgetInr: p.budgetInr ? num(p, "budgetInr") : undefined,
            estimateInr: p.estimateInr ? num(p, "estimateInr") : undefined,
            status: "suggested",
            itinerary: Array.isArray(p.itinerary) ? (p.itinerary as AppState["trips"][number]["itinerary"]) : undefined,
          },
          ...s.trips.filter((t) => t.id !== "trip-beach"),
        ],
      };
      break;
    }
    case "notes.save": {
      const id = str(p, "id");
      if (id && s.notes.some((n) => n.id === id)) {
        s = {
          ...s,
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, title: str(p, "title", n.title), body: str(p, "body", n.body), updatedAt: event.timestamp, shared: bool(p, "shared", n.shared) }
              : n,
          ),
        };
      } else {
        s = {
          ...s,
          notes: [
            {
              id: uid("note"),
              title: str(p, "title", "Untitled"),
              body: str(p, "body"),
              createdAt: event.timestamp,
              updatedAt: event.timestamp,
              authorId: event.actor_id,
              shared: bool(p, "shared"),
              linkedEventIds: [],
            },
            ...s.notes,
          ],
        };
      }
      break;
    }
    case "notes.share": {
      const id = str(p, "id");
      s = { ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, shared: !n.shared } : n)) };
      break;
    }
    case "finance.bill.queue": {
      const id = str(p, "id");
      s = { ...s, bills: s.bills.map((b) => (b.id === id ? { ...b, status: "queued" } : b)) };
      s = { ...s, dismissedSuggestionIds: [...s.dismissedSuggestionIds, "sugg-bill"] };
      break;
    }
    case "finance.bill.pay": {
      const id = str(p, "id");
      const bill = s.bills.find((b) => b.id === id);
      s = {
        ...s,
        bills: s.bills.map((b) => (b.id === id ? { ...b, status: "paid" } : b)),
        accounts: bill
          ? s.accounts.map((a) =>
              a.id === "acc-check" ? { ...a, balanceInr: a.balanceInr - bill.amountInr } : a,
            )
          : s.accounts,
      };
      break;
    }
    case "finance.loan.settle": {
      const id = str(p, "id");
      const loan = s.loans.find((l) => l.id === id);
      if (loan) {
        s = {
          ...s,
          loans: s.loans.map((l) => (l.id === id ? { ...l, amountInr: 0 } : l)),
          accounts: s.accounts.map((a) => {
            if (a.id === "acc-media" && loan.from === "me") return { ...a, balanceInr: a.balanceInr - loan.amountInr };
            if (a.id === "acc-check" && loan.from === "me") return { ...a, balanceInr: a.balanceInr + loan.amountInr };
            return a;
          }),
        };
      }
      break;
    }
    case "ent.capture": {
      const target = str(p, "targetTab", "notes") as TabId;
      const text = str(p, "text");
      s = {
        ...s,
        captures: [
          { id: uid("cap"), text, targetTab: target, timestamp: event.timestamp, actorId: event.actor_id },
          ...s.captures,
        ],
      };
      if (target === "notes") {
        s = {
          ...s,
          notes: [
            {
              id: uid("note"),
              title: "Capture",
              body: text,
              createdAt: event.timestamp,
              updatedAt: event.timestamp,
              authorId: event.actor_id,
              shared: false,
              linkedEventIds: [event.id],
            },
            ...s.notes,
          ],
        };
      }
      if (target === "shopping") {
        s = {
          ...s,
          research: [
            {
              id: uid("res"),
              category: "Captured",
              name: text.slice(0, 48),
              notes: text,
              priceInr: 0,
              lastPriceInr: 0,
            },
            ...s.research,
          ],
        };
      }
      if (target === "travel") {
        s = {
          ...s,
          notes: [
            {
              id: uid("note"),
              title: "Travel research",
              body: text,
              createdAt: event.timestamp,
              updatedAt: event.timestamp,
              authorId: event.actor_id,
              shared: false,
              linkedEventIds: [event.id],
            },
            ...s.notes,
          ],
        };
      }
      break;
    }
    case "chat.ask": {
      const tab = (str(p, "tab", "notes") as TabId) || "notes";
      const channel = (str(p, "channel", "text") as ExchangeChannel) || "text";
      const pending = asPendingFiles(p.files);
      const exchangeId = uid("ex");
      let folders = s.folders ?? [];
      let folderId: string | null = null;
      const storeInVault = event.actor_id === SELF_ID && pending.length > 0;
      if (storeInVault) {
        const resolved = resolveFolderId(folders, tab, str(p, "folderName") || undefined);
        folders = resolved.folders;
        folderId = resolved.folderId;
      }
      const newFiles = pending.map((f) => {
        let dataUrl = f.dataUrl;
        if (dataUrl && dataUrlBudgetUsed(s.files) + dataUrl.length > 1_500_000) dataUrl = undefined;
        return {
          id: uid("vf"),
          name: f.name,
          mime: f.mime,
          size: f.size,
          folderId,
          createdAt: event.timestamp,
          dataUrl,
          textExcerpt: f.textExcerpt,
          exchangeId,
          sourceTab: tab,
        };
      });
      const exchange = {
        id: exchangeId,
        tab,
        channel,
        title: str(p, "title", "Capture"),
        query: str(p, "query"),
        response: str(p, "response"),
        timestamp: event.timestamp,
        actorId: event.actor_id,
        fileIds: newFiles.map((f) => f.id),
      };
      s = {
        ...s,
        folders,
        files: [...newFiles, ...(s.files ?? [])],
        exchanges: [exchange, ...(s.exchanges ?? [])],
      };
      const side = str(p, "sideEffectKind", "none");
      const sideTitle = str(p, "sideEffectTitle", exchange.title);
      if (side === "task" && sideTitle) {
        s = {
          ...s,
          tasks: [
            {
              id: uid("task"),
              title: sideTitle,
              done: false,
              ownerId: SELF_ID,
              createdBy: event.actor_id,
              priority: 2,
            },
            ...s.tasks,
          ],
        };
      }
      if (side === "note" && sideTitle) {
        s = {
          ...s,
          notes: [
            {
              id: uid("note"),
              title: sideTitle,
              body: exchange.query + (exchange.response ? `\n\n${exchange.response}` : ""),
              createdAt: event.timestamp,
              updatedAt: event.timestamp,
              authorId: event.actor_id,
              shared: false,
              linkedEventIds: [event.id],
            },
            ...s.notes,
          ],
        };
      }
      if (side === "reminder" && sideTitle) {
        s = {
          ...s,
          reminders: [
            {
              id: uid("rem"),
              title: sideTitle,
              when: event.timestamp + 2 * 3600_000,
              ownerId: SELF_ID,
              createdBy: event.actor_id,
              fired: false,
            },
            ...s.reminders,
          ],
        };
      }
      break;
    }
    case "vault.folder.create": {
      const parentId = str(p, "parentId") || null;
      const name = str(p, "name", "Untitled folder").slice(0, 48);
      s = {
        ...s,
        folders: [
          { id: uid("fld"), name, parentId: parentId === "" ? null : parentId, createdAt: event.timestamp },
          ...s.folders,
        ],
      };
      break;
    }
    case "vault.folder.rename": {
      const id = str(p, "id");
      const name = str(p, "name").slice(0, 48);
      if (id && name) s = { ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)) };
      break;
    }
    case "vault.folder.delete": {
      const id = str(p, "id");
      const hasKids = s.folders.some((f) => f.parentId === id) || s.files.some((f) => f.folderId === id);
      if (!hasKids) s = { ...s, folders: s.folders.filter((f) => f.id !== id) };
      break;
    }
    case "vault.file.add": {
      const pending = asPendingFiles(p.files);
      const folderId = str(p, "folderId") || null;
      const newFiles = pending.map((f) => {
        let dataUrl = f.dataUrl;
        if (dataUrl && dataUrlBudgetUsed(s.files) + dataUrl.length > 1_500_000) dataUrl = undefined;
        return {
          id: uid("vf"),
          name: f.name,
          mime: f.mime,
          size: f.size,
          folderId: folderId === "" ? null : folderId,
          createdAt: event.timestamp,
          dataUrl,
          textExcerpt: f.textExcerpt,
          sourceTab: "files" as TabId,
        };
      });
      s = { ...s, files: [...newFiles, ...s.files] };
      break;
    }
    case "vault.file.move": {
      const id = str(p, "id");
      const folderId = str(p, "folderId") || null;
      s = { ...s, files: s.files.map((f) => (f.id === id ? { ...f, folderId: folderId === "" ? null : folderId } : f)) };
      break;
    }
    case "vault.file.delete": {
      const id = str(p, "id");
      s = {
        ...s,
        files: s.files.filter((f) => f.id !== id),
        exchanges: s.exchanges.map((e) => ({ ...e, fileIds: e.fileIds.filter((x) => x !== id) })),
      };
      break;
    }
    case "shortcut.save": {
      const phrase = str(p, "phrase").slice(0, 32).trim();
      const command = str(p, "command").slice(0, 160).trim();
      if (!phrase || !command) break;
      const id = str(p, "id") || uid("sc");
      const existing = s.shortcuts.find((x) => x.id === id || normPhrase(x.phrase) === normPhrase(phrase));
      if (existing) {
        s = {
          ...s,
          shortcuts: s.shortcuts.map((x) => (x.id === existing.id ? { ...x, phrase, command } : x)),
        };
      } else {
        s = { ...s, shortcuts: [{ id, phrase, command }, ...s.shortcuts] };
      }
      break;
    }
    case "shortcut.delete": {
      const id = str(p, "id");
      s = { ...s, shortcuts: s.shortcuts.filter((x) => x.id !== id) };
      break;
    }
    case "people.invite": {
      const name = str(p, "name").slice(0, 48).trim();
      if (!name) break;
      const circle = (str(p, "circle", "friends") as CircleId) || "friends";
      const title = str(p, "title") || circle;
      const email = str(p, "email") || undefined;
      const phone = str(p, "phone") || undefined;
      const channel = (str(p, "channel", "whatsapp") as InviteChannel) || "whatsapp";
      const id = str(p, "id") || uid("p");
      const scopes = asPersonScopes(p.scopes);
      const person: Person = {
        id,
        name,
        shortName: name.split(/\s+/)[0] || name,
        circle,
        title,
        initials: initialsOf(name),
        email,
        phone,
        inviteStatus: "pending",
        inviteChannel: channel,
        invitedAt: event.timestamp,
        scopes,
      };
      s = { ...s, people: [...s.people.filter((x) => x.id !== id), person] };
      break;
    }
    case "people.accept": {
      const id = str(p, "id");
      s = {
        ...s,
        people: s.people.map((x) => (x.id === id ? { ...x, inviteStatus: "accepted" } : x)),
      };
      break;
    }
    case "people.revoke": {
      const id = str(p, "id");
      if (id && id !== SELF_ID) {
        s = { ...s, people: s.people.filter((x) => x.id !== id), actorId: s.actorId === id ? SELF_ID : s.actorId };
      }
      break;
    }
    case "people.access": {
      const id = str(p, "id");
      if (!id || id === SELF_ID) break;
      const scopes = asPersonScopes(p.scopes) ?? [];
      s = { ...s, people: s.people.map((x) => (x.id === id ? { ...x, scopes } : x)) };
      if (s.actorId === id) {
        const vis = visibleTabs(s, id);
        if (!vis.includes(s.activeTab)) s = { ...s, activeTab: vis[0] ?? "work" };
      }
      break;
    }
    case "connector.connect":
    case "connector.sync": {
      const id = str(p, "id") as ConnectorId;
      const meta = catalogOf(id);
      if (!id || !meta) break;
      const imported = applyConnectorImport(s, id, event.timestamp);
      const connectors = s.connectors.map((c) =>
        c.id === id ? { ...c, status: "connected" as const, account: meta.account, lastSync: event.timestamp } : c,
      );
      s = { ...s, ...imported, connectors };
      break;
    }
    case "connector.disconnect": {
      const id = str(p, "id");
      s = {
        ...s,
        connectors: s.connectors.map((c) => (c.id === id ? { ...c, status: "disconnected" as const } : c)),
      };
      break;
    }
    case "suggestion.dismiss": {
      s = { ...s, dismissedSuggestionIds: [...s.dismissedSuggestionIds, str(p, "id")] };
      break;
    }
    default:
      break;
  }

  s = { ...s, suggestions: evaluateRules(s) };
  return s;
}

const seed = (): AppState => {
  const domain = buildSeed();
  const base = {
    ...domain,
    actorId: SELF_ID,
    activeTab: "home" as TabId,
    act: () => ({ ok: true }),
    setActor: () => {},
    setTab: () => {},
    setHomeLayout: () => {},
    setWidgets: () => {},
    markRead: () => {},
    markAllRead: () => {},
  };
  return { ...base, suggestions: evaluateRules(base) };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seed(),
      act: (type, payload = {}, links = []) => {
        const state = get();
        const err = canAct(state, state.actorId, type, payload);
        if (err) return { ok: false, error: err };

        if (type === "suggestion.accept") {
          const sid = str(payload, "suggestionId");
          const then = str(payload, "then");
          set((curr) => {
            const dismissed = { ...curr, dismissedSuggestionIds: [...curr.dismissedSuggestionIds, sid] };
            return { ...dismissed, suggestions: evaluateRules(dismissed) };
          });
          if (then) {
            const nextPayload = { ...payload };
            delete nextPayload.then;
            delete nextPayload.suggestionId;
            return get().act(then, nextPayload, links);
          }
          return { ok: true };
        }
        if (type === "suggestion.open") {
          const tab = str(payload, "tab") as TabId;
          const sid = str(payload, "suggestionId");
          set((curr) => ({
            activeTab: tab,
            dismissedSuggestionIds: [...curr.dismissedSuggestionIds, sid],
          }));
          return { ok: true };
        }
        if (type === "ui.tab") {
          get().setTab(str(payload, "tab") as TabId);
          return { ok: true };
        }

        const event: TimelineEvent = {
          id: uid("ev"),
          type,
          timestamp: Date.now(),
          source_tab: type === "chat.ask" ? ((str(payload, "tab", "notes") as TabId) || "notes") : tabFromType(type),
          actor_id: state.actorId,
          payload,
          links,
        };
        const extras = notificationsForEvent(type, payload, state.actorId).map((n) => ({
          ...n,
          id: uid("n"),
          timestamp: Date.now(),
          read: false,
        }));
        set((curr) => {
          const withEvent: AppState = {
            ...curr,
            timeline: [event, ...curr.timeline],
            notifications: [...extras, ...curr.notifications],
          };
          return apply(withEvent, event);
        });
        return { ok: true };
      },
      setActor: (id) => {
        const state = get();
        const tabs = visibleTabs(state, id);
        const nextTab = tabs.includes(state.activeTab) ? state.activeTab : (tabs[0] ?? "work");
        set({ actorId: id, activeTab: nextTab });
      },
      setTab: (tab) => set({ activeTab: tab }),
      setHomeLayout: (layout) => set({ homeLayout: layout }),
      setWidgets: (widgets) => set({ widgets: mergeWidgets(widgets) }),
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    }),
    {
      name: "superhuman-v1",
      version: 6,
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : localStorage)),
      skipHydration: true,
      migrate: (persisted, version) => {
        const s = persisted as AppState;
        const fresh = buildSeed();
        if (version < 2) {
          s.exchanges = s.exchanges ?? fresh.exchanges;
          s.folders = s.folders ?? fresh.folders;
          s.files = s.files ?? fresh.files;
        }
        if (version < 3) {
          s.shortcuts = s.shortcuts?.length ? s.shortcuts : fresh.shortcuts;
        }
        if (version < 4) {
          s.homeLayout = s.homeLayout ?? "board";
        }
        if (version < 5) {
          s.widgets = mergeWidgets(s.widgets);
        }
        if (version < 6) {
          s.connectors = mergeConnectors(s.connectors);
        }
        return s;
      },
      partialize: (s) => {
        const { act: _a, setActor: _b, setTab: _c, setHomeLayout: _f, setWidgets: _g, markRead: _d, markAllRead: _e, ...rest } = s;
        return rest as AppState;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          act: current.act,
          setActor: current.setActor,
          setTab: current.setTab,
          setHomeLayout: current.setHomeLayout,
          setWidgets: current.setWidgets,
          markRead: current.markRead,
          markAllRead: current.markAllRead,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const fresh = buildSeed();
        const live = useAppStore.getState();
        if (!state.timeline || state.timeline.length === 0) {
          useAppStore.setState({ ...fresh, actorId: live.actorId || SELF_ID, activeTab: live.activeTab || "home", suggestions: evaluateRules(fresh) });
          return;
        }
        useAppStore.setState({
          suggestions: evaluateRules(state),
          actorId: live.actorId || SELF_ID,
          activeTab: live.activeTab || "home",
          exchanges: state.exchanges ?? fresh.exchanges,
          folders: state.folders?.length ? state.folders : fresh.folders,
          files: state.files?.length ? state.files : fresh.files,
          shortcuts: state.shortcuts?.length ? state.shortcuts : fresh.shortcuts,
          homeLayout: state.homeLayout ?? "board",
          widgets: mergeWidgets(state.widgets),
          people: mergePeople(state.people, fresh.people),
          connectors: mergeConnectors(state.connectors),
          waThreads: state.waThreads ?? fresh.waThreads,
          diet: state.diet?.length ? state.diet : fresh.diet,
          streams: (state.streams?.length ? state.streams : fresh.streams).map((s) => {
            const f = fresh.streams.find((x) => x.source === s.source);
            if (!f) return s;
            return {
              ...f,
              ...s,
              sleepScore: s.sleepScore ?? f.sleepScore,
              deepSleepH: s.deepSleepH ?? f.deepSleepH,
              remSleepH: s.remSleepH ?? f.remSleepH,
              lightSleepH: s.lightSleepH ?? f.lightSleepH,
              spo2: s.spo2 ?? f.spo2,
              skinTempDeltaC: s.skinTempDeltaC ?? f.skinTempDeltaC,
              respRate: s.respRate ?? f.respRate,
              strain: s.strain ?? f.strain,
              calories: s.calories ?? f.calories,
              activeMin: s.activeMin ?? f.activeMin,
              vo2: s.vo2 ?? f.vo2,
              glucoseMgDl: s.glucoseMgDl ?? f.glucoseMgDl,
            };
          }),
        });
      },
    },
  ),
);

export function personById(state: Domain, id: string) {
  return state.people.find((p) => p.id === id);
}

function mergePeople(saved: Person[], fresh: Person[]) {
  const ids = new Set(saved.map((p) => p.id));
  return [...saved, ...fresh.filter((p) => !ids.has(p.id))];
}

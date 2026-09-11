import { ALL_TABS, SELF_ID, type Access, type CircleId, type Domain, type TabId } from "./types";

export type Scope = {
  tab: TabId;
  access: Access;
  healthFilter?: "workout" | "full";
};

export const CIRCLE_SCOPES: Record<CircleId, Scope[]> = {
  self: ALL_TABS.map((tab) => ({ tab, access: "admin" as const })),
  family: [
    { tab: "work", access: "edit" },
    { tab: "shopping", access: "edit" },
    { tab: "notes", access: "edit" },
  ],
  coworkers: [{ tab: "work", access: "edit" }],
  friends: [
    { tab: "entertainment", access: "edit" },
    { tab: "travel", access: "edit" },
    { tab: "work", access: "edit" },
  ],
  trainers: [
    { tab: "work", access: "edit" },
    { tab: "health", access: "edit", healthFilter: "workout" },
  ],
  doctors: [
    { tab: "health", access: "admin", healthFilter: "full" },
    { tab: "notes", access: "edit" },
  ],
  coaches: [
    { tab: "health", access: "edit", healthFilter: "full" },
    { tab: "growth", access: "edit" },
  ],
  nutritionists: [
    { tab: "health", access: "edit", healthFilter: "full" },
    { tab: "shopping", access: "edit" },
  ],
  accountants: [
    { tab: "finance", access: "edit" },
    { tab: "businesses", access: "view" },
  ],
};

export function personCircle(state: Domain, actorId: string): CircleId {
  return state.people.find((p) => p.id === actorId)?.circle ?? "friends";
}

export function scopesFor(state: Domain, actorId: string): Scope[] {
  if (actorId === SELF_ID) return CIRCLE_SCOPES.self;
  const person = state.people.find((p) => p.id === actorId);
  if (person?.scopes?.length) return person.scopes;
  return CIRCLE_SCOPES[personCircle(state, actorId)] ?? CIRCLE_SCOPES.friends;
}

export function visibleTabs(state: Domain, actorId: string): TabId[] {
  if (actorId === SELF_ID) return ALL_TABS;
  return scopesFor(state, actorId).map((s) => s.tab);
}

export function tabAccess(state: Domain, actorId: string, tab: TabId): Access | null {
  if (actorId === SELF_ID) return "admin";
  return scopesFor(state, actorId).find((s) => s.tab === tab)?.access ?? null;
}

export function canView(state: Domain, actorId: string, tab: TabId) {
  return tabAccess(state, actorId, tab) !== null || (actorId === SELF_ID && tab === "home");
}

export function canEdit(state: Domain, actorId: string, tab: TabId) {
  const a = tabAccess(state, actorId, tab);
  return a === "edit" || a === "admin";
}

export function healthFilter(state: Domain, actorId: string): "workout" | "full" | "none" {
  if (actorId === SELF_ID) return "full";
  return scopesFor(state, actorId).find((s) => s.tab === "health")?.healthFilter ?? "none";
}

export function canMutateCalendar(actorId: string, ownerId: string, action: "delete" | "reschedule" | "propose") {
  if (action === "propose") return true;
  return actorId === ownerId;
}

const TAB_FROM_TYPE: Record<string, TabId> = {
  "health.": "health",
  "work.": "work",
  "growth.": "growth",
  "travel.": "travel",
  "shop.": "shopping",
  "notes.": "notes",
  "finance.": "finance",
  "biz.": "businesses",
  "ent.": "entertainment",
  "suggestion.": "home",
  "vault.": "files",
  "chat.": "notes",
  "shortcut.": "home",
  "people.": "home",
  "connector.": "home",
};

export function tabFromType(type: string): TabId {
  for (const [prefix, tab] of Object.entries(TAB_FROM_TYPE)) {
    if (type.startsWith(prefix)) return tab;
  }
  return "home";
}

export function canAct(state: Domain, actorId: string, type: string, payload: Record<string, unknown>): string | null {
  if (type.startsWith("people.") && actorId !== SELF_ID) return "Only you can invite contributors.";
  if (type.startsWith("connector.") && actorId !== SELF_ID) return "Only you can manage connectors.";
  if (type === "chat.ask") {
    const dest = String(payload.tab ?? "notes") as TabId;
    if (actorId === SELF_ID) return null;
    if (!canEdit(state, actorId, dest)) return `No ${dest} edit access.`;
    return null;
  }
  const tab = tabFromType(type);
  if (type.startsWith("suggestion.") && actorId === SELF_ID) return null;
  if (type === "health.note.add") {
    if (actorId !== SELF_ID && tabAccess(state, actorId, "health") !== "admin") {
      return "Only a health admin can write the chart.";
    }
  }
  if (!canEdit(state, actorId, tab) && actorId !== SELF_ID) {
    if (tab === "home") return "No access.";
    if (tabAccess(state, actorId, tab) === "view") return `${tab} is view-only for this role.`;
    return `No ${tab} edit access.`;
  }
  if (type === "work.calendar.delete" || type === "work.calendar.reschedule") {
    const id = String(payload.id ?? "");
    const item = state.calendar.find((c) => c.id === id);
    if (!item) return "Missing calendar item.";
    if (item.ownerId !== actorId) return "Only the owner can delete or reschedule this block.";
  }
  if (type.startsWith("finance.") && actorId !== SELF_ID && !canEdit(state, actorId, "finance") && tabAccess(state, actorId, "finance") !== "view") {
    return "Finance is private.";
  }
  if (type.startsWith("biz.") && actorId !== SELF_ID && tabAccess(state, actorId, "businesses") === null) {
    return "Businesses are private.";
  }
  if (type.startsWith("vault.") && actorId !== SELF_ID) return "Files are private.";
  if (type.startsWith("shortcut.") && actorId !== SELF_ID) return "Shortcuts are private.";
  return null;
}
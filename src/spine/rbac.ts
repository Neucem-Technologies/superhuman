import { TAB_LABELS, type Access, type CircleId, type TabId } from "./types";
import type { Scope } from "./permissions";
import { CIRCLE_SCOPES } from "./permissions";

export const RBAC_TABS: TabId[] = [
  "work",
  "health",
  "shopping",
  "notes",
  "travel",
  "entertainment",
  "growth",
  "finance",
  "businesses",
];

export const TAB_SHORT: Record<string, string> = {
  work: "Work",
  health: "Health",
  shopping: "Shop",
  notes: "Notes",
  travel: "Travel",
  entertainment: "Enjoy",
  growth: "Grow",
  finance: "₹",
  businesses: "Biz",
};

export function cycleAccess(cur: Access | null): Access | null {
  if (cur == null) return "view";
  if (cur === "view") return "edit";
  if (cur === "edit") return "admin";
  return null;
}

export function accessMark(a: Access | null) {
  if (!a) return "—";
  if (a === "view") return "V";
  if (a === "edit") return "E";
  return "A";
}

export function accessWord(a: Access | null) {
  if (!a) return "none";
  return a;
}

export function healthSlice(circle: CircleId, access: Access): Scope["healthFilter"] {
  if (access === "admin") return "full";
  if (circle === "trainers") return "workout";
  return "full";
}

export function makeScope(circle: CircleId, tab: TabId, access: Access): Scope {
  return {
    tab,
    access,
    healthFilter: tab === "health" ? healthSlice(circle, access) : undefined,
  };
}

export function grantsFromScopes(scopes: Scope[]): Partial<Record<TabId, Access>> {
  const g: Partial<Record<TabId, Access>> = {};
  for (const s of scopes) g[s.tab] = s.access;
  return g;
}

export function scopesFromGrants(circle: CircleId, grants: Partial<Record<TabId, Access>>): Scope[] {
  return RBAC_TABS.filter((t) => grants[t]).map((t) => makeScope(circle, t, grants[t]!));
}

export function describeScopes(scopes: Scope[]) {
  return scopes
    .map((s) => {
      const extra = s.tab === "health" && s.healthFilter === "workout" ? " workout" : "";
      return `${TAB_LABELS[s.tab]} ${s.access}${extra}`;
    })
    .join(" · ");
}

export function roleScopes(circle: CircleId): Scope[] {
  return CIRCLE_SCOPES[circle] ?? CIRCLE_SCOPES.friends;
}

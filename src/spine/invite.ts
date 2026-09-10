import { TAB_LABELS, type CircleId, type InviteChannel, type Person, type TabId } from "./types";
import type { Scope } from "./permissions";

export type InviteCircle = Exclude<CircleId, "self">;

export const CIRCLE_GROUP = {
  family: { label: "Family", circles: ["family"] as InviteCircle[] },
  friends: { label: "Friends", circles: ["friends"] as InviteCircle[] },
  coworkers: { label: "Co-workers", circles: ["coworkers"] as InviteCircle[] },
  advisors: {
    label: "Advisors",
    circles: ["coaches", "trainers", "nutritionists", "doctors", "accountants"] as InviteCircle[],
  },
};

export const CIRCLE_META: Record<InviteCircle, { label: string; title: string; blurb: string }> = {
  family: { label: "Family", title: "Family", blurb: "Lists, notes, and the shared calendar — not each other." },
  friends: { label: "Friends", title: "Friend", blurb: "Plans, travel holds, a calendar hold. They do not see family." },
  coworkers: { label: "Co-workers", title: "Co-worker", blurb: "Work calendar and tasks only." },
  coaches: { label: "Health coach", title: "Health coach", blurb: "Health streams and growth. No medical notes." },
  trainers: { label: "Trainer", title: "Trainer", blurb: "Workout plan and session holds on Work." },
  nutritionists: { label: "Nutritionist", title: "Nutritionist", blurb: "Protocol and the grocery list. Not the full chart." },
  doctors: { label: "Doctor", title: "Physician", blurb: "Health records and notes. Observational — they do not prescribe in-app." },
  accountants: { label: "Accountant", title: "Accountant", blurb: "Finance and company pots. Not health, not files." },
};

export function circleGroup(circle: CircleId): keyof typeof CIRCLE_GROUP | "self" {
  if (circle === "self") return "self";
  if (circle === "family") return "family";
  if (circle === "friends") return "friends";
  if (circle === "coworkers") return "coworkers";
  return "advisors";
}

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export function shortNameFrom(name: string) {
  return name.trim().split(/\s+/).filter(Boolean)[0] || "Guest";
}

export function digitsPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  return d;
}

export function scopeSummary(scopes: Scope[]) {
  return scopes.map((s) => TAB_LABELS[s.tab]).join(", ");
}

export function inviteBody(person: Pick<Person, "name" | "title">, scopes: Scope[], origin: string, id: string) {
  const areas = scopeSummary(scopes);
  return [
    `Rajan invited you to Superhuman as ${person.title}.`,
    `You will see: ${areas}. Nothing else — hub-and-spoke, you cannot see other contributors.`,
    `Accept: ${origin}?invite=${id}`,
  ].join("\n\n");
}

export function channelUrl(channel: InviteChannel, contact: string, subject: string, body: string) {
  if (channel === "whatsapp") {
    const phone = digitsPhone(contact);
    const q = `text=${encodeURIComponent(body)}`;
    return phone ? `https://wa.me/${phone}?${q}` : `https://wa.me/?${q}`;
  }
  const to = contact.includes("@") ? contact : "";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const ACCESS_TABS: TabId[] = [
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

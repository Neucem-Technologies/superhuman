export const TZ = "Asia/Kolkata";

function parts(ts = Date.now()) {
  const list = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(ts));
  const get = (t: string) => list.find((p) => p.type === t)?.value ?? "";
  return {
    y: Number(get("year")),
    mo: Number(get("month")),
    d: Number(get("day")),
    h: Number(get("hour")),
    m: Number(get("minute")),
    wd: get("weekday"),
  };
}

/** Instant for an IST wall-clock time, `day` offset from today in IST. */
export function at(h: number, min = 0, day = 0) {
  const p = parts();
  const utc = Date.UTC(p.y, p.mo - 1, p.d + day, h, min, 0) - 5.5 * 3600 * 1000;
  return utc;
}

export function todayKey(ts = Date.now()) {
  const p = parts(ts);
  return `${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

export function periodOfDay(ts = Date.now()): DayPeriod {
  const h = parts(ts).h;
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "afternoon";
  if (h >= 16 && h < 19) return "evening";
  return "night";
}

export function greetingFor(period: DayPeriod = periodOfDay()) {
  if (period === "morning") return "Good morning";
  if (period === "evening") return "Good evening";
  if (period === "night") return "Good night";
  return "Good afternoon";
}

export function formatTime(ts: number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(ts);
}

export function formatDay(ts: number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(ts);
}

export function weekdayShort(ts = Date.now()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
  }).format(new Date(ts));
}

export function formatShortDay(ts: number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(ts);
}

export function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function inrCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 10_00_000) return `${n < 0 ? "-" : ""}₹${(abs / 10_00_000).toFixed(1)}L`;
  if (abs >= 1000) return `${n < 0 ? "-" : ""}₹${Math.round(abs / 1000)}k`;
  return inr(n);
}

export function relative(ts: number, now = Date.now()) {
  const d = Math.round((ts - now) / 60000);
  if (Math.abs(d) < 1) return "now";
  if (d > 0 && d < 60) return `in ${d}m`;
  if (d < 0 && d > -60) return `${-d}m ago`;
  const h = Math.round(d / 60);
  if (h > 0 && h < 24) return `in ${h}h`;
  if (h < 0 && h > -24) return `${-h}h ago`;
  const days = Math.round(h / 24);
  if (days >= 0) return `in ${days}d`;
  return `${-days}d ago`;
}

export function rangeLabel(start: number, end: number) {
  return `${formatTime(start)}–${formatTime(end)}`;
}

export { parts as istParts };

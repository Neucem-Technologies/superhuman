import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  CloudSun,
  FolderOpen,
  HeartPulse,
  MapPin,
  Pin,
  Plane,
  Plus,
  ShoppingBag,
  Sprout,
  StickyNote,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, Modal, Segmented } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { visibleTabs } from "@/spine/permissions";
import { formatDay, formatTime, inr, todayKey, weekdayShort } from "@/spine/format";
import { aqiLabel, useDelhiWeather } from "@/spine/weather";
import { dayInsights, dueSoonTotal, personalCash, workMode } from "@/spine/rules";
import { SELF_ID, SHELF_TABS, TAB_LABELS, type TabId, type WidgetPref, type WidgetSize } from "@/spine/types";
import { defaultWidgets, mergeWidgets, railWidth } from "@/spine/widgets";
import { Hud } from "@/components/shell/Hud";
import { FamilyMapTile } from "@/components/shell/FamilyMap";

const SHELF_ICONS: Record<string, typeof Sprout> = {
  growth: Sprout,
  travel: Plane,
  entertainment: Clapperboard,
  shopping: ShoppingBag,
  notes: StickyNote,
  files: FolderOpen,
  work: Briefcase,
  health: HeartPulse,
  finance: Wallet,
  businesses: Building2,
};

const TILE_SRC: Record<string, string> = {
  insights: "/tiles/insights.jpg?v=4",
  tasks: "/tiles/tasks.jpg?v=4",
  calendar: "/tiles/calendar.jpg?v=4",
  reminders: "/tiles/reminders.jpg?v=4",
  health: "/tiles/health.jpg?v=4",
  growth: "/tiles/growth.jpg?v=4",
  travel: "/tiles/travel.jpg?v=4",
  entertainment: "/tiles/entertainment.jpg?v=4",
  shopping: "/tiles/shopping.jpg?v=4",
  notes: "/tiles/notes.jpg?v=4",
  files: "/tiles/files.jpg?v=4",
  work: "/tiles/work.jpg?v=4",
  finance: "/tiles/finance.jpg?v=4",
  businesses: "/tiles/businesses.jpg?v=4",
};

function tileSrc(id: string) {
  return TILE_SRC[id] ?? "/tiles/insights.jpg?v=4";
}

function TileHead({ src, children, onOpen }: { src: string; children: ReactNode; onOpen?: () => void }) {
  return (
    <div
      className="tile-head relative -mx-3 -mt-3 mb-3 overflow-hidden"
      style={{ "--tile-image": `url("${src}")` } as CSSProperties}
    >
      <Hud variant="tile" />
      {onOpen ? (
        <button type="button" onClick={onOpen} className="today-hero relative block w-full px-3 py-3 text-left">
          {children}
        </button>
      ) : (
        <div className="today-hero relative px-3 py-3">{children}</div>
      )}
    </div>
  );
}

function buzz() {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}

function MetricCell({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad" | "neutral";
}) {
  return (
    <div className="min-w-0 rounded-sm bg-surface/70 px-1.5 py-1.5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-base tabular-nums text-foreground",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
          tone === "bad" && "text-bad",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function HealthMetrics({
  ultra,
  checkin,
}: {
  ultra?: { stress: number; recovery: number };
  checkin?: { mood: number; anxiety: number };
}) {
  if (!ultra && !checkin) return null;
  const cells: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "neutral" }[] = [
    { label: "Mood", value: checkin ? `${checkin.mood}/5` : "—", tone: (checkin?.mood ?? 3) <= 2 ? "warn" : "neutral" },
    { label: "Anxiety", value: checkin ? `${checkin.anxiety}/5` : "—", tone: (checkin?.anxiety ?? 0) >= 4 ? "warn" : "neutral" },
    { label: "Stress", value: ultra ? String(ultra.stress) : "—", tone: (ultra?.stress ?? 0) >= 70 ? "warn" : "ok" },
    { label: "Recovery", value: ultra ? String(ultra.recovery) : "—", tone: (ultra?.recovery ?? 100) < 50 ? "warn" : "ok" },
  ];
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">Metrics</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <MetricCell key={c.label} label={c.label} value={c.value} tone={c.tone} />
        ))}
      </div>
    </div>
  );
}

export function Coach() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("sh-coach") === "1") setShow(false);
    } catch {
      /* keep */
    }
  }, []);
  if (!show) return null;
  return (
    <div className="glass flex items-center gap-2 rounded-md px-3 py-2">
      <span className="live-dot shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-xs text-muted">
        Tap a tile to open it. Needs you is the work for right now. Type, speak, or attach in the bar — try “taken”.
      </p>
      <button
        type="button"
        className="shrink-0 text-xs text-accent"
        onClick={() => {
          try {
            localStorage.setItem("sh-coach", "1");
          } catch {
            /* ignore */
          }
          setShow(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="flex items-center gap-2 font-mono text-sm tabular-nums text-foreground">
      <span className="live-dot" aria-hidden />
      {formatTime(now)}
    </p>
  );
}

function TodayHeader() {
  const snap = useDelhiWeather();
  const [open, setOpen] = useState(false);
  return (
    <section className="widget-tile overflow-hidden rounded-xl p-3">
      <header className="today-hero today-split">
        <div className="today-split-main">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Today</h1>
            <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{formatDay(Date.now())}</p>
          </div>
          <LiveClock />
        </div>
        <button type="button" onClick={() => setOpen(true)} className="today-split-wx">
          <span className="flex flex-col items-end gap-0.5">
            <span className="wx-line">
              <MapPin className="size-3 text-accent" />
              <span className="text-xs font-medium text-foreground">{snap.place}</span>
            </span>
            <span className="wx-line">
              <CloudSun className="size-3.5 text-accent" />
              <span className="font-mono text-xl tabular-nums text-foreground">{snap.tempC}°</span>
              <span className="text-xs font-medium text-muted">{snap.label}</span>
            </span>
          </span>
          <span className="text-xs leading-relaxed text-muted">{snap.prediction}</span>
        </button>
      </header>
      <Modal open={open} onClose={() => setOpen(false)} title={snap.place}>
        <p className="font-mono text-3xl tabular-nums">
          {snap.tempC}° <span className="text-base text-muted">{snap.label}</span>
        </p>
        <p className="text-sm text-muted">{snap.prediction}</p>
        <p className="text-xs text-subtle">
          High {snap.highC}° · Low {snap.lowC}° · AQI {snap.aqi} {aqiLabel(snap.aqi)}
        </p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {snap.hours.map((h) => (
            <div key={h.hour} className="min-w-14 shrink-0 text-center">
              <p className="text-xs text-subtle">{h.hour}</p>
              <p className="mt-1 font-mono text-sm tabular-nums">{h.tempC}°</p>
              <p className="text-xs text-muted">{h.pop}%</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">{snap.advice}</p>
      </Modal>
    </section>
  );
}

export function NeedsYou() {
  const f = useHomeFacts();
  const pendingCal = f.blocks.filter((b) => b.status === "pending");
  const items: { id: string; kicker: string; title: string; label: string; tint: string; run: () => void }[] = [];
  for (const b of pendingCal) {
    items.push({
      id: b.id,
      kicker: "Calendar",
      title: b.title,
      label: "Accept",
      tint: "work",
      run: () => {
        const r = f.act("work.calendar.accept", { id: b.id });
        if (r.ok) {
          buzz();
          toast("Accepted");
        } else toast.error(r.error);
      },
    });
  }
  for (const a of f.pendingAdh.slice(0, 2)) {
    items.push({
      id: a.id,
      kicker: "Protocol",
      title: a.name,
      label: "Taken?",
      tint: "health",
      run: () => {
        const r = f.act("health.adherence.log", { itemId: a.id, taken: true });
        if (r.ok) {
          buzz();
          toast("Logged");
        } else toast.error(r.error);
      },
    });
  }
  if (f.dueBill) {
    const bill = f.dueBill;
    items.push({
      id: bill.id,
      kicker: "Bill",
      title: bill.name,
      label: "Queue",
      tint: "finance",
      run: () => {
        const r = f.act("finance.bill.queue", { id: bill.id });
        if (r.ok) {
          buzz();
          toast("Queued");
        } else toast.error(r.error);
      },
    });
  }
  if (f.suggestions[0]?.actions[0]) {
    const s = f.suggestions[0];
    const a = s.actions[0];
    items.push({
      id: s.id,
      kicker: "Nudge",
      title: s.title,
      label: a.label,
      tint: "growth",
      run: () => {
        const r = f.act(a.eventType, a.payload);
        if (r.ok) {
          buzz();
          toast(a.label);
        } else toast.error(r.error);
      },
    });
  }
  if (!items.length) return null;
  return (
    <section>
      <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Needs you</p>
      <div className="stagger-in flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar">
        {items.map((item) => (
          <div
            key={item.id}
            data-tint={item.tint}
            className="widget-tile flex min-w-52 shrink-0 snap-start items-center gap-2 rounded-xl px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="widget-mark text-xs uppercase tracking-wide">{item.kicker}</p>
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
            </div>
            <Button size="sm" onClick={item.run}>
              {item.label}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LayoutSwitch() {
  const layout = useAppStore((s) => s.homeLayout ?? "board");
  const setHomeLayout = useAppStore((s) => s.setHomeLayout);
  return (
    <Segmented
      value={layout}
      onChange={setHomeLayout}
      options={[
        { id: "stack", label: "Stack" },
        { id: "board", label: "Board" },
        { id: "agenda", label: "Agenda" },
      ]}
    />
  );
}

function useHomeFacts() {
  const calendar = useAppStore((s) => s.calendar);
  const tasks = useAppStore((s) => s.tasks);
  const emails = useAppStore((s) => s.emails);
  const adherence = useAppStore((s) => s.adherence);
  const suggestions = useAppStore((s) => s.suggestions);
  const streams = useAppStore((s) => s.streams);
  const bills = useAppStore((s) => s.bills);
  const businesses = useAppStore((s) => s.businesses);
  const records = useAppStore((s) => s.records);
  const checkins = useAppStore((s) => s.checkins);
  const reminders = useAppStore((s) => s.reminders);
  const workout = useAppStore((s) => s.workout);
  const diet = useAppStore((s) => s.diet ?? []);
  const setTab = useAppStore((s) => s.setTab);
  const act = useAppStore((s) => s.act);
  const weather = useDelhiWeather();
  const today = todayKey();
  const blocks = calendar
    .filter((c) => c.ownerId === SELF_ID && c.status !== "declined" && todayKey(c.start) === today)
    .sort((a, b) => a.start - b.start);
  return {
    blocks,
    next: blocks.find((b) => b.end > Date.now()) ?? blocks[0],
    pendingTasks: tasks.filter((t) => t.ownerId === SELF_ID && !t.done),
    unread: emails.filter((e) => e.unread).length,
    pendingAdh: adherence.filter((a) => !a.taken && !a.missed),
    ultra: streams.find((s) => s.source === "ultrahuman"),
    dueBill: bills.find((b) => b.status === "due"),
    biz: businesses[0],
    note: records[0],
    cash: personalCash(useAppStore.getState()),
    due: dueSoonTotal(useAppStore.getState()),
    mode: workMode({ checkins }),
    suggestions,
    insight: dayInsights(useAppStore.getState(), weather),
    upcoming: reminders.filter((r) => !r.fired && r.ownerId === SELF_ID).slice(0, 4),
    diet,
    workout,
    session: workout.days.find((d) => d.day === weekdayShort()),
    checkin: checkins[0],
    setTab,
    act,
    weather,
  };
}

export function BoardHome() {
  const f = useHomeFacts();
  const shownTasks = f.mode === "low" ? f.pendingTasks.filter((t) => t.tiny).slice(0, 2) : f.pendingTasks.slice(0, 5);
  const parked = f.mode === "low" ? f.pendingTasks.filter((t) => !t.tiny) : [];

  return (
    <div className="stagger-in space-y-3">
      <TodayHeader />

      <section data-tint="growth" className="widget-tile overflow-hidden rounded-xl p-3">
        <TileHead src={TILE_SRC.insights} onOpen={() => f.setTab("growth")}>
          <div className="widget-mark flex items-center gap-1.5">
            <Sprout className="size-3.5" />
            <span className="text-xs font-bold uppercase tracking-wide">Insights</span>
            <ChevronRight className="ml-auto size-3.5 opacity-50" />
          </div>
        </TileHead>
        <p className="text-sm font-medium leading-relaxed text-foreground">{f.insight.headline}</p>
        <ul className="mt-2 space-y-1">
          {f.insight.points.map((p) => (
            <li key={p} className="text-xs text-muted">
              {p}
            </li>
          ))}
        </ul>
        {f.suggestions[0] && (
          <div className="mt-3 flex flex-wrap gap-2">
            {f.suggestions[0].actions.slice(0, 2).map((a) => (
              <Button
                key={a.label}
                size="sm"
                onClick={() => {
                  const r = f.act(a.eventType, a.payload);
                  if (!r.ok) toast.error(r.error);
                  else {
                    buzz();
                    toast(a.label);
                  }
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </section>

      <section data-tint="work" className="widget-tile overflow-hidden rounded-xl p-3">
        <TileHead src={TILE_SRC.tasks} onOpen={() => f.setTab("work")}>
          <div className="widget-mark flex items-center gap-1.5">
            <Briefcase className="size-3.5" />
            <span className="text-xs font-bold uppercase tracking-wide">Today’s Tasks</span>
            <ChevronRight className="ml-auto size-3.5 opacity-50" />
          </div>
        </TileHead>
        {f.mode === "low" && <p className="mb-2 text-xs text-muted">Low-energy day. Two things. The rest waits.</p>}
        <ul className="space-y-1">
          {shownTasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  if (f.act("work.task.toggle", { id: t.id }).ok) buzz();
                }}
                className="pressable flex w-full items-center gap-2 py-1.5 text-left"
              >
                <span className="flex size-5 items-center justify-center rounded-xs bg-surface shadow-border">
                  {t.done ? <Check className="size-3" /> : null}
                </span>
                <span className="text-sm text-foreground">{t.title}</span>
                {t.tiny && <span className="ml-auto text-xs text-muted">tiny</span>}
              </button>
            </li>
          ))}
        </ul>
        {parked.length > 0 && <p className="mt-2 text-xs text-muted">Parked {parked.length} — not failed.</p>}
      </section>

      <section data-tint="work" className="widget-tile overflow-hidden rounded-xl p-3">
        <TileHead src={TILE_SRC.calendar} onOpen={() => f.setTab("work")}>
          <div className="widget-mark flex items-center gap-1.5">
            <Briefcase className="size-3.5" />
            <span className="text-xs font-bold uppercase tracking-wide">Calendar</span>
            <ChevronRight className="ml-auto size-3.5 opacity-50" />
          </div>
        </TileHead>
        <ul className="divide-y divide-border">
          {f.blocks.length === 0 && <li className="py-2 text-sm text-muted">Clear day.</li>}
          {f.blocks.map((b) => {
            const isNext = f.next?.id === b.id;
            return (
            <li key={b.id} className={cn("flex items-start gap-3 py-2", isNext && "-mx-1 rounded-sm bg-surface/70 px-1")}>
              <span className={cn("w-14 shrink-0 pt-0.5 font-mono text-xs tabular-nums", isNext ? "text-accent" : "text-muted")}>
                {formatTime(b.start)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {b.title}
                  {b.status === "pending" ? <span className="ml-2 text-xs text-warn">needs confirm</span> : null}
                </p>
                <p className="text-xs text-muted">
                  {b.kind}
                  {b.shortened ? " · shortened" : ""}
                  {b.lightened ? " · lightened" : ""}
                </p>
              </div>
              {b.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => {
                    const r = f.act("work.calendar.accept", { id: b.id });
                    if (r.ok) {
                      buzz();
                      toast("Accepted");
                    } else toast.error(r.error);
                  }}
                >
                  Accept
                </Button>
              )}
            </li>
            );
          })}
        </ul>
      </section>

      <section data-tint="work" className="widget-tile overflow-hidden rounded-xl p-3">
        <TileHead src={TILE_SRC.reminders} onOpen={() => f.setTab("work")}>
          <div className="widget-mark flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide">Reminders</span>
            <ChevronRight className="ml-auto size-3.5 opacity-50" />
          </div>
        </TileHead>
        <p className="mb-2 text-xs text-muted">Display only — they also fire as notifications.</p>
        <ul className="space-y-2">
          {f.upcoming.length === 0 && <li className="text-sm text-muted">None left today.</li>}
          {f.upcoming.map((r) => (
            <li key={r.id} className="flex items-baseline gap-3">
              <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted">{formatTime(r.when)}</span>
              <span className="text-sm text-foreground">{r.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section data-tint="health" className="widget-tile overflow-hidden rounded-xl p-3">
        <TileHead src={TILE_SRC.health} onOpen={() => f.setTab("health")}>
          <div className="widget-mark flex items-center gap-1.5">
            <HeartPulse className="size-3.5" />
            <span className="text-xs font-bold uppercase tracking-wide">Health at a glance</span>
            <ChevronRight className="ml-auto size-3.5 opacity-50" />
          </div>
        </TileHead>
        <HealthMetrics ultra={f.ultra} checkin={f.checkin} />
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wide text-muted">Supplements</p>
          <ul className="mt-1.5 space-y-2">
            {f.pendingAdh.length === 0 && <li className="text-sm text-muted">Protocol clear.</li>}
            {f.pendingAdh.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted">
                    {a.dose} · {a.kind}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const r = f.act("health.adherence.log", { itemId: a.id, taken: true });
                    if (r.ok) {
                      buzz();
                      toast("Logged");
                    } else toast.error(r.error);
                  }}
                >
                  Taken?
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wide text-muted">Diet</p>
          <ul className="mt-1.5 space-y-2">
            {f.diet.map((m) => (
              <li key={m.id}>
                <p className="text-sm font-medium text-foreground">
                  <span className="text-xs uppercase tracking-wide text-muted">{m.slot} · </span>
                  {m.title}
                </p>
                <p className="text-xs text-muted">{m.notes}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wide text-muted">Workout</p>
        {f.session ? (
          <div className="mt-1.5">
            <p className="text-sm font-medium text-foreground">
              {f.session.focus} · {f.workout.title}
            </p>
            <p className="text-xs text-muted">{f.workout.notes}</p>
            <p className="mt-1 text-xs text-muted">{f.weather.advice}</p>
            <ul className="mt-1 space-y-0.5">
              {f.session.exercises.map((ex) => (
                <li key={ex.name} className="text-sm text-foreground">
                  {ex.name} <span className="text-xs text-muted">{ex.sets}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-muted">Rest day. Walk if energy allows.</p>
            <p className="mt-1 text-xs text-muted">{f.weather.advice}</p>
          </>
        )}
        </div>
      </section>

      <section>
        <ShelfWidgets variant="strip" title="Shelf" />
      </section>
      <FamilyMapTile />
    </div>
  );
}

export function AgendaHome() {
  const f = useHomeFacts();
  const rows: {
    time: string;
    title: string;
    meta: string;
    tab?: TabId;
    action?: () => void;
    actionLabel?: string;
  }[] = [];
  for (const b of f.blocks.slice(0, 4)) {
    rows.push({
      time: formatTime(b.start),
      title: b.title,
      meta: b.status === "pending" ? "needs confirm" : b.kind,
      tab: "work",
    });
  }
  for (const a of f.pendingAdh.slice(0, 2)) {
    rows.push({
      time: "Now",
      title: a.name,
      meta: a.dose,
      action: () => {
        const r = f.act("health.adherence.log", { itemId: a.id, taken: true });
        if (r.ok) toast("Logged");
        else toast.error(r.error);
      },
      actionLabel: "Taken?",
    });
  }
  if (f.dueBill) {
    rows.push({ time: "Bill", title: f.dueBill.name, meta: inr(f.dueBill.amountInr), tab: "finance" });
  }
  if (f.suggestions[0]) {
    rows.push({ time: "Nudge", title: f.suggestions[0].title, meta: f.suggestions[0].reason, tab: "home" });
  }
  return (
    <div className="space-y-4">
      <TodayHeader />
      <NeedsYou />
      <ShelfWidgets variant="rail" title="Shelf" />
      <ul className="space-y-0">
        {rows.map((r, i) => (
          <li key={`${r.title}-${i}`} className="flex items-start gap-3 border-b border-border py-3 last:border-0">
            <span className="w-12 shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted">{r.time}</span>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => r.tab && f.setTab(r.tab)}>
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <p className="text-xs text-muted">{r.meta}</p>
            </button>
            {r.action && (
              <Button size="sm" onClick={r.action}>
                {r.actionLabel}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {f.pendingTasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted">Tasks</p>
          {(f.mode === "low" ? f.pendingTasks.filter((t) => t.tiny).slice(0, 2) : f.pendingTasks.slice(0, 4)).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => f.act("work.task.toggle", { id: t.id })}
              className="flex h-10 w-full items-center gap-2 text-left text-sm"
            >
              <span className="flex size-5 items-center justify-center rounded-xs shadow-border">
                {t.done ? <Check className="size-3" /> : null}
              </span>
              {t.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type CardData = { id: TabId; kicker: string; title: string; body: string; stat: string };

function useWidgetCards(): CardData[] {
  const actorId = useAppStore((s) => s.actorId);
  const vis = visibleTabs(useAppStore.getState(), actorId);
  const growth = useAppStore((s) => s.growth);
  const chat = useAppStore((s) => s.chat);
  const trips = useAppStore((s) => s.trips);
  const streams = useAppStore((s) => s.streams);
  const lists = useAppStore((s) => s.lists);
  const notes = useAppStore((s) => s.notes);
  const folders = useAppStore((s) => s.folders ?? []);
  const files = useAppStore((s) => s.files ?? []);
  const stress = streams.find((s) => s.source === "ultrahuman")?.stress ?? 50;
  const topGrowth = [...growth].sort((a, b) => b.streak - a.streak)[0];
  const lastBot = [...chat].reverse().find((m) => m.role === "bot");
  const nextTrip = trips.find((t) => t.status === "watching" || t.status === "planned") ?? trips[0];
  const openShop = lists.reduce((n, l) => n + l.items.filter((i) => !i.checked).length, 0);
  const latestNote = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const pick = stress >= 60 ? "Music for Inner Stillness" : "New wave mix";
  const cards: CardData[] = [
    {
      id: "growth",
      kicker: "Growth",
      title: topGrowth ? `${topGrowth.streak}d · ${topGrowth.title}` : "Library",
      stat: topGrowth ? `${topGrowth.streak}d` : "—",
      body: lastBot?.text ?? "Chat the library. Yoga Nidra lives here.",
    },
    {
      id: "travel",
      kicker: "Travel",
      title: nextTrip?.title ?? "Trips",
      stat: nextTrip?.destination ?? "—",
      body: nextTrip
        ? `${nextTrip.destination}${nextTrip.budgetInr ? ` · ${inr(nextTrip.budgetInr)}` : ""}`
        : "Work and personal, cash-flow checked.",
    },
    {
      id: "entertainment",
      kicker: "Enjoy",
      title: pick,
      stat: stress >= 60 ? "Quiet" : "Bright",
      body: stress >= 60 ? "Stress is up. Quiet picks." : "Energy is up. Brighter picks.",
    },
    {
      id: "shopping",
      kicker: "Shop",
      title: `${openShop} open on lists`,
      stat: `${openShop} open`,
      body: lists[0] ? lists.map((l) => l.name).join(" · ") : "Groceries and vault.",
    },
    {
      id: "notes",
      kicker: "Notes",
      title: latestNote?.title ?? "Quick capture",
      stat: `${notes.length}`,
      body: latestNote?.body.slice(0, 90) ?? "Voice through the bar files here.",
    },
    {
      id: "files",
      kicker: "Files",
      title: `${folders.length} folders`,
      stat: `${files.length} files`,
      body: `${files.length} files in the vault`,
    },
  ];
  return cards.filter((c) => vis.includes(c.id) && (SHELF_TABS as readonly string[]).includes(c.id));
}

function ShelfWidgets({ variant = "grid", title }: { variant?: "grid" | "rail" | "split" | "strip"; title?: string }) {
  const [editing, setEditing] = useState(false);
  const actorId = useAppStore((s) => s.actorId);
  const prefs = mergeWidgets(useAppStore((s) => s.widgets));
  const setWidgets = useAppStore((s) => s.setWidgets);
  const setTab = useAppStore((s) => s.setTab);
  const cards = useWidgetCards();
  const byId = new Map(cards.map((c) => [c.id, c]));
  const canEdit = actorId === SELF_ID;
  const ordered = prefs.filter((w) => byId.has(w.id));
  const shown = ordered.filter((w) => w.visible);
  const hidden = ordered.filter((w) => !w.visible);
  const pinned = shown.filter((w) => w.pinned);
  const rest = shown.filter((w) => !w.pinned);
  function patch(id: TabId, next: Partial<WidgetPref>) {
    setWidgets(prefs.map((w) => (w.id === id ? { ...w, ...next } : w)));
  }
  function move(id: TabId, dir: number) {
    const i = prefs.findIndex((w) => w.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= prefs.length) return;
    const copy = [...prefs];
    const [item] = copy.splice(i, 1);
    copy.splice(j, 0, item);
    setWidgets(copy);
  }
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {title ? <p className="text-xs uppercase tracking-wide text-muted">{title}</p> : <span />}
        {canEdit && (
          <div className="flex gap-2">
            {editing && (
              <button type="button" className="text-xs text-muted" onClick={() => setWidgets(defaultWidgets())}>
                Reset
              </button>
            )}
            <button type="button" className="text-xs text-muted" onClick={() => setEditing((v) => !v)}>
              {editing ? "Done" : "Edit"}
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">Pin, size, density, order. Hidden widgets sit in the library.</p>
          {shown.map((w) => {
            const card = byId.get(w.id);
            if (!card) return null;
            return (
              <div key={w.id} className="rounded-md bg-elevated p-3 shadow-border">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wide text-subtle">{card.kicker}</p>
                    <p className="text-sm font-medium">{w.density === "stat" ? card.stat : card.title}</p>
                  </div>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      aria-label="Move up"
                      className="flex size-8 items-center justify-center"
                      onClick={() => move(w.id, -1)}
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      className="flex size-8 items-center justify-center"
                      onClick={() => move(w.id, 1)}
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Chip on={w.pinned} onClick={() => patch(w.id, { pinned: !w.pinned })}>
                    <Pin className="size-3" />
                    Pin
                  </Chip>
                  {(["s", "m", "l"] as WidgetSize[]).map((sz) => (
                    <Chip key={sz} on={w.size === sz} onClick={() => patch(w.id, { size: sz })}>
                      {sz.toUpperCase()}
                    </Chip>
                  ))}
                  <Chip on={w.density === "stat"} onClick={() => patch(w.id, { density: w.density === "stat" ? "story" : "stat" })}>
                    {w.density === "stat" ? "Stat" : "Story"}
                  </Chip>
                  <Chip on={false} onClick={() => patch(w.id, { visible: false })}>
                    Hide
                  </Chip>
                </div>
              </div>
            );
          })}
          {hidden.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-subtle">Library</p>
              <div className="flex flex-wrap gap-1.5">
                {hidden.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="flex h-8 items-center gap-1 rounded-sm bg-elevated px-2 text-xs shadow-border"
                    onClick={() => patch(w.id, { visible: true })}
                  >
                    <Plus className="size-3" />
                    {TAB_LABELS[w.id]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">Shelf is empty. Tap Edit to restore widgets.</p>
      ) : variant === "strip" ? (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {SHELF_TABS.map((id) => {
            const card = byId.get(id);
            if (!card) return null;
            const pref = prefs.find((w) => w.id === id) ?? {
              id,
              visible: true,
              size: "s" as const,
              pinned: false,
              density: "story" as const,
            };
            return <WidgetCard key={id} pref={pref} card={card} onOpen={setTab} layout="strip" />;
          })}
        </div>
      ) : variant === "split" ? (
        <div className="space-y-2">
          {pinned.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {pinned.map((w) => {
                const card = byId.get(w.id);
                if (!card) return null;
                return <WidgetCard key={w.id} pref={w} card={card} onOpen={setTab} layout="grid" />;
              })}
            </div>
          )}
          {rest.length > 0 && (
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar">
              {rest.map((w) => {
                const card = byId.get(w.id);
                if (!card) return null;
                return <WidgetCard key={w.id} pref={w} card={card} onOpen={setTab} layout="rail" />;
              })}
            </div>
          )}
        </div>
      ) : variant === "rail" ? (
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar">
          {shown.map((w) => {
            const card = byId.get(w.id);
            if (!card) return null;
            return <WidgetCard key={w.id} pref={w} card={card} onOpen={setTab} layout="rail" />;
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {shown.map((w) => {
            const card = byId.get(w.id);
            if (!card) return null;
            return <WidgetCard key={w.id} pref={w} card={card} onOpen={setTab} layout="grid" />;
          })}
        </div>
      )}
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex h-8 items-center gap-1 rounded-sm px-2 text-xs", on ? "bg-surface text-foreground" : "text-muted")}
    >
      {children}
    </button>
  );
}

function WidgetCard({
  pref,
  card,
  onOpen,
  layout,
}: {
  pref: WidgetPref;
  card: CardData;
  onOpen: (tab: TabId) => void;
  layout: "grid" | "rail" | "strip";
}) {
  const Icon = SHELF_ICONS[card.id] ?? StickyNote;
  const wide = pref.size === "l" && layout === "grid";
  return (
    <button
      type="button"
      onClick={() => onOpen(card.id)}
      data-tint={card.id}
      className={cn(
        "widget-tile pressable overflow-hidden rounded-xl p-3 text-left",
        layout === "strip" && "h-[10.75rem] w-[42%] min-w-[42%] shrink-0 snap-start",
        layout === "rail" && cn("min-h-28 shrink-0 snap-start", railWidth(pref.size)),
        layout === "grid" && cn("min-h-28", wide && "col-span-2"),
      )}
    >
      <TileHead src={tileSrc(card.id)}>
        <div className="widget-mark flex items-center gap-1.5">
          <Icon className="size-3.5" />
          <span className="text-xs font-bold uppercase tracking-wide">{card.kicker}</span>
          {pref.pinned && <Pin className="ml-auto size-3" />}
          {!pref.pinned && <ChevronRight className="ml-auto size-3.5 opacity-50" />}
        </div>
      </TileHead>
      {pref.density === "stat" && layout !== "strip" ? (
        <p className="font-mono text-lg tabular-nums text-foreground">{card.stat}</p>
      ) : (
        <>
          <p className="text-sm font-medium leading-relaxed text-foreground">{card.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{card.body}</p>
        </>
      )}
    </button>
  );
}

export function WidgetGrid({ variant = "grid" }: { onOpen?: (tab: TabId) => void; variant?: "grid" | "rail" | "split" | "strip" }) {
  return <ShelfWidgets variant={variant} />;
}

export function isShelfTab(tab: TabId) {
  return (SHELF_TABS as readonly string[]).includes(tab);
}

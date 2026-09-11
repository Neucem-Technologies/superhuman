import { Check, MapPin } from "lucide-react";
import { NeedsYou } from "@/components/shell/HomeLayouts";
import { Button, Card, SectionTitle } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { formatTime, rangeLabel, todayKey } from "@/spine/format";
import { SELF_ID } from "@/spine/types";
import { workMode } from "@/spine/rules";
import { toast } from "sonner";

export function HomeTab() {
  const actorId = useAppStore((s) => s.actorId);
  const calendar = useAppStore((s) => s.calendar);
  const tasks = useAppStore((s) => s.tasks);
  const reminders = useAppStore((s) => s.reminders);
  const adherence = useAppStore((s) => s.adherence);
  const suggestions = useAppStore((s) => s.suggestions);
  const streams = useAppStore((s) => s.streams);
  const locations = useAppStore((s) => s.locations);
  const people = useAppStore((s) => s.people);
  const act = useAppStore((s) => s.act);
  const setTab = useAppStore((s) => s.setTab);
  const checkins = useAppStore((s) => s.checkins);
  const mode = workMode({ checkins });

  const today = todayKey();
  const blocks = calendar
    .filter((c) => c.ownerId === SELF_ID && c.status !== "declined" && todayKey(c.start) === today)
    .sort((a, b) => a.start - b.start);
  const pendingTasks = tasks.filter((t) => t.ownerId === SELF_ID && !t.done);
  const shown = mode === "low" ? pendingTasks.filter((t) => t.tiny).slice(0, 2) : pendingTasks.slice(0, 4);
  const upcoming = reminders.filter((r) => !r.fired && r.ownerId === SELF_ID).slice(0, 3);
  const pendingAdh = adherence.filter((a) => !a.taken && !a.missed);
  const ultra = streams.find((s) => s.source === "ultrahuman");

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wide text-subtle">Today</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Briefing</h1>
        <button type="button" className="mt-1 text-left text-sm text-muted" onClick={() => setTab("health")}>
          Sleep {ultra?.sleepHours.toFixed(1)}h · stress {ultra?.stress} · recovery {ultra?.recovery}
          {mode === "low" ? " · low-energy day" : ""}
        </button>
      </header>
      <NeedsYou />

      {pendingAdh.length > 0 && (
        <section>
          <SectionTitle>Protocol · taken?</SectionTitle>
          <div className="space-y-2">
            {pendingAdh.map((a) => (
              <Card key={a.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted">
                    {a.dose} · {a.kind}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const r = act("health.adherence.log", { itemId: a.id, taken: true });
                    if (r.ok) toast("Logged");
                    else toast.error(r.error);
                  }}
                >
                  Taken?
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {suggestions.length > 0 && (
        <section>
          <SectionTitle>Across LivinSync</SectionTitle>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <Card key={s.id}>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
                <p className="mt-1 text-xs text-subtle">{s.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.actions.map((a) => (
                    <Button
                      key={a.label}
                      size="sm"
                      onClick={() => {
                        const r = act(a.eventType, a.payload);
                        if (!r.ok) toast.error(r.error);
                        else toast(a.label);
                      }}
                    >
                      {a.label}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => act("suggestion.dismiss", { id: s.id })}>
                    Dismiss
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle right={<button type="button" className="text-xs text-muted" onClick={() => setTab("work")}>Work</button>}>
          Calendar
        </SectionTitle>
        <Card className="divide-y divide-border p-0">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="w-16 shrink-0 text-xs tabular-nums text-muted">{formatTime(b.start)}</div>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setTab("work")}>
                <p className="text-sm font-medium">
                  {b.title}
                  {b.status === "pending" ? <span className="ml-2 text-xs text-warn">needs confirm</span> : null}
                </p>
                <p className="text-xs text-subtle">
                  {rangeLabel(b.start, b.end)}
                  {b.shortened ? " · shortened" : ""}
                  {b.lightened ? " · lightened" : ""}
                </p>
              </button>
              {b.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => {
                    const r = act("work.calendar.accept", { id: b.id });
                    if (r.ok) toast("Accepted");
                    else toast.error(r.error);
                  }}
                >
                  Accept
                </Button>
              )}
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Tasks</SectionTitle>
        {mode === "low" && (
          <p className="mb-2 text-xs text-muted">Low-energy day. Two things. The rest waits.</p>
        )}
        <Card className="space-y-1">
          {shown.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => act("work.task.toggle", { id: t.id })}
              className="flex w-full items-center gap-2 rounded-sm py-1.5 text-left"
            >
              <span className="flex size-5 items-center justify-center rounded-xs shadow-border">
                {t.done ? <Check className="size-3" /> : null}
              </span>
              <span className="text-sm">{t.title}</span>
            </button>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Reminders</SectionTitle>
        <p className="mb-2 text-xs text-subtle">Display only — they also fire as notifications.</p>
        <ul className="space-y-1.5">
          {upcoming.map((r) => (
            <li key={r.id} className="flex justify-between text-sm">
              <span>{r.title}</span>
              <span className="tabular-nums text-muted">{formatTime(r.when)}</span>
            </li>
          ))}
        </ul>
      </section>

      {actorId === SELF_ID && (
        <section>
          <SectionTitle>Family · one-way to you</SectionTitle>
          <Card>
            <p className="mb-2 text-xs text-subtle">Hub-and-spoke. They do not see each other, or you.</p>
            <div className="relative h-36 overflow-hidden rounded-md bg-elevated">
              <svg viewBox="0 0 200 140" className="size-full">
                <rect width="200" height="140" fill="#1a1a1e" />
                <path d="M20 90 C 50 40, 90 30, 140 50 S 190 90, 180 120" fill="none" stroke="#2c2c32" strokeWidth="8" />
                <circle cx="100" cy="70" r="4" fill="#c8ccd4" />
                <text x="108" y="66" fill="#a1a1aa" fontSize="8">
                  You · GK-II
                </text>
                {locations.map((loc, i) => {
                  const x = 40 + i * 80;
                  const y = 40 + i * 30;
                  const who = people.find((p) => p.id === loc.personId);
                  return (
                    <g key={loc.personId}>
                      <line x1="100" y1="70" x2={x} y2={y} stroke="#2c2c32" strokeWidth="1" />
                      <circle cx={x} cy={y} r="3" fill="#8fad96" />
                      <text x={x + 6} y={y + 3} fill="#a1a1aa" fontSize="8">
                        {who?.shortName} · {loc.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <ul className="mt-2 space-y-1">
              {locations.map((loc) => {
                const who = people.find((p) => p.id === loc.personId);
                return (
                  <li key={loc.personId} className="flex items-center gap-2 text-xs text-muted">
                    <MapPin className="size-3" />
                    {who?.name} · {loc.label}
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}

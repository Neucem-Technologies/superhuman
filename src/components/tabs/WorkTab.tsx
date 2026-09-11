import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Badge, Button, Card, Input, SectionTitle, Segmented } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { formatTime, rangeLabel, todayKey } from "@/spine/format";
import { peakHours, workMode } from "@/spine/rules";
import { canMutateCalendar } from "@/spine/permissions";
import { SELF_ID } from "@/spine/types";
import { toast } from "sonner";
import { SlideHero } from "@/components/shell/SlideHero";

export function WorkTab() {
  const [sec, setSec] = useState<"agenda" | "tasks" | "mail">("agenda");
  const [taskTitle, setTaskTitle] = useState("");
  const actorId = useAppStore((s) => s.actorId);
  const calendar = useAppStore((s) => s.calendar);
  const tasks = useAppStore((s) => s.tasks);
  const emails = useAppStore((s) => s.emails);
  const reminders = useAppStore((s) => s.reminders);
  const usage = useAppStore((s) => s.usageByHour);
  const checkins = useAppStore((s) => s.checkins);
  const people = useAppStore((s) => s.people);
  const waThreads = useAppStore((s) => s.waThreads ?? []);
  const act = useAppStore((s) => s.act);
  const mode = workMode({ checkins });
  const peaks = peakHours({ usageByHour: usage });
  const day = todayKey();

  const blocks = calendar
    .filter((c) => todayKey(c.start) === day)
    .filter((c) => (actorId === SELF_ID ? c.ownerId === SELF_ID || c.ownerId === actorId : c.ownerId === actorId || c.ownerId === SELF_ID))
    .sort((a, b) => a.start - b.start);

  const myTasks = useMemo(() => {
    const mine = tasks.filter((t) => t.ownerId === (actorId === SELF_ID ? SELF_ID : actorId) || (actorId !== SELF_ID && t.ownerId === SELF_ID));
    if (actorId === SELF_ID && mode === "low") {
      const tiny = mine.filter((t) => t.tiny || t.ownerId !== SELF_ID);
      const rest = mine.filter((t) => !tiny.includes(t));
      return { primary: tiny, rest };
    }
    return { primary: mine, rest: [] as typeof mine };
  }, [tasks, actorId, mode]);

  return (
    <div className="space-y-4">
      <SlideHero slide="work">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Work</h1>
        <p className="mt-0.5 text-sm text-foreground/85">
          Peak {peaks[0]}–{peaks[peaks.length - 1] + 1}h
          {mode === "low" ? " · low-energy, tiny list" : mode === "hyper" ? " · hyperfocus window" : ""}
        </p>
      </SlideHero>
      <Segmented
        value={sec}
        onChange={setSec}
        options={[
          { id: "agenda", label: "Agenda" },
          { id: "tasks", label: "Tasks" },
          { id: "mail", label: "Inbox" },
        ]}
      />

      {sec === "agenda" && (
        <div className="space-y-4">
          {waThreads.length > 0 && (
            <section>
              <SectionTitle>WhatsApp</SectionTitle>
              <div className="space-y-2">
                {waThreads.map((t) => (
                  <Card key={t.id}>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-sm text-muted">{t.preview}</p>
                    <p className="mt-1 text-xs text-subtle">{t.tab}</p>
                  </Card>
                ))}
              </div>
            </section>
          )}
          <SectionTitle>Usage · auto deep-work</SectionTitle>
          <div className="flex h-12 items-end gap-px">
            {usage.map((v, h) => (
              <div
                key={h}
                title={`${h}:00`}
                className="flex-1 rounded-xs"
                style={{
                  height: `${Math.max(8, (v / 14) * 100)}%`,
                  background: peaks.includes(h) ? "var(--color-accent)" : "var(--color-elevated)",
                  opacity: peaks.includes(h) ? 1 : 0.7,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-subtle">Deep-work windows sit on the tall bars. Short sleep shortened today’s 9–11 block to 9:00–10:15, lightened.</p>

          <Card className="divide-y divide-border p-0">
            {blocks.map((b) => {
              const inviter = b.invitedBy ? people.find((p) => p.id === b.invitedBy) : null;
              const canMut = canMutateCalendar(actorId, b.ownerId, "delete");
              return (
                <div key={b.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{b.title}</p>
                      <p className="text-xs text-muted">
                        {rangeLabel(b.start, b.end)} · {b.kind}
                        {b.shortened ? " · shortened" : ""}
                        {inviter ? ` · ${inviter.shortName}` : ""}
                      </p>
                    </div>
                    <Badge tone={b.status === "pending" ? "warn" : b.status === "declined" ? "bad" : "ok"}>{b.status}</Badge>
                  </div>
                  {b.status === "pending" && b.ownerId === actorId && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => { act("work.calendar.accept", { id: b.id }); toast("Accepted"); }}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { act("work.calendar.decline", { id: b.id }); toast("Declined"); }}>
                        Decline
                      </Button>
                    </div>
                  )}
                  {canMut && b.status === "confirmed" && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-subtle"
                      onClick={() => {
                        const r = act("work.calendar.delete", { id: b.id });
                        if (!r.ok) toast.error(r.error);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
          </Card>

          <SectionTitle>Reminders (notifications, not clutter)</SectionTitle>
          <ul className="space-y-1 text-sm text-muted">
            {reminders
              .filter((r) => r.ownerId === SELF_ID || r.ownerId === actorId)
              .map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span>{r.title}</span>
                  <span className="tabular-nums">{formatTime(r.when)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {sec === "tasks" && (
        <div className="space-y-3">
          {mode === "low" && actorId === SELF_ID && (
            <p className="text-sm text-muted">Low-energy day. Two tiny tasks. Everything else is parked — not failed.</p>
          )}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskTitle.trim()) return;
              const r = act("work.task.add", { title: taskTitle.trim(), ownerId: actorId === SELF_ID ? SELF_ID : SELF_ID, tiny: true });
              if (!r.ok) toast.error(r.error);
              else {
                toast("Task added");
                setTaskTitle("");
              }
            }}
          >
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Add a task" />
            <Button type="submit" size="md">
              Add
            </Button>
          </form>
          <Card className="space-y-1">
            {myTasks.primary.map((t) => (
              <TaskRow key={t.id} id={t.id} title={t.title} done={t.done} meta={t.tiny ? "tiny" : undefined} />
            ))}
          </Card>
          {myTasks.rest.length > 0 && (
            <div className="opacity-40">
              <p className="mb-1 text-xs uppercase tracking-wide text-subtle">Parked</p>
              {myTasks.rest.map((t) => (
                <p key={t.id} className="py-1 text-sm">
                  {t.title}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {sec === "mail" && (
        <div className="space-y-2">
          {emails.map((e) => (
            <Card
              key={e.id}
              className="cursor-pointer"
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => act("work.email.read", { id: e.id })}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{e.fromName}</p>
                  <div className="flex gap-1">
                    {e.source === "google" && <Badge tone="accent">Google</Badge>}
                    <Badge tone={e.mailbox === "work" ? "neutral" : "accent"}>{e.mailbox}</Badge>
                  </div>
                </div>
                <p className="text-sm">{e.subject}</p>
                <p className="text-xs text-muted">{e.preview}</p>
                {e.unread ? <p className="mt-1 text-xs text-ok">Unread</p> : null}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ id, title, done, meta }: { id: string; title: string; done: boolean; meta?: string }) {
  const act = useAppStore((s) => s.act);
  return (
    <button type="button" onClick={() => act("work.task.toggle", { id })} className="flex w-full items-center gap-2 py-1.5 text-left">
      <span className="flex size-5 items-center justify-center rounded-xs shadow-border">
        {done ? <Check className="size-3" /> : null}
      </span>
      <span className={done ? "text-sm text-muted line-through" : "text-sm"}>{title}</span>
      {meta ? <span className="ml-auto text-xs text-subtle">{meta}</span> : null}
    </button>
  );
}

import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { useAppStore } from "@/spine/store";
import { formatTime, rangeLabel, todayKey } from "@/spine/format";
import { peakHours, workMode } from "@/spine/rules";
import { canMutateCalendar } from "@/spine/permissions";
import { SELF_ID } from "@/spine/types";
import { Body, Btn, Field, Label, Muted, Screen, Seg, Tile } from "../ui";
import { colors } from "../../theme";

export function WorkTab() {
  const [sec, setSec] = useState<"agenda" | "tasks" | "mail">("agenda");
  const [taskTitle, setTaskTitle] = useState("");
  const actorId = useAppStore((s) => s.actorId);
  const calendar = useAppStore((s) => s.calendar);
  const tasks = useAppStore((s) => s.tasks);
  const emails = useAppStore((s) => s.emails);
  const reminders = useAppStore((s) => s.reminders);
  const waThreads = useAppStore((s) => s.waThreads ?? []);
  const usage = useAppStore((s) => s.usageByHour);
  const checkins = useAppStore((s) => s.checkins);
  const people = useAppStore((s) => s.people);
  const act = useAppStore((s) => s.act);
  const mode = workMode({ checkins });
  const peaks = peakHours({ usageByHour: usage });
  const day = todayKey();
  const blocks = calendar.filter((c) => todayKey(c.start) === day).sort((a, b) => a.start - b.start);
  const mine = useMemo(() => {
    const list = tasks.filter((t) => t.ownerId === actorId || t.ownerId === SELF_ID);
    if (actorId === SELF_ID && mode === "low") {
      const tiny = list.filter((t) => t.tiny || t.ownerId !== SELF_ID);
      return { primary: tiny, rest: list.filter((t) => !tiny.includes(t)) };
    }
    return { primary: list, rest: [] as typeof list };
  }, [tasks, actorId, mode]);

  function run(type: string, payload: Record<string, unknown>, ok?: string) {
    const r = act(type, payload);
    if (!r.ok) Alert.alert("Couldn’t", r.error ?? "Failed");
    else if (ok) Alert.alert(ok);
  }

  return (
    <Screen title="Work" subtitle={`Peak ${peaks[0]}–${peaks[peaks.length - 1] + 1}h${mode === "low" ? " · low-energy" : ""}`}>
      <Seg
        value={sec}
        onChange={setSec}
        options={[
          { id: "agenda", label: "Agenda" },
          { id: "tasks", label: "Tasks" },
          { id: "mail", label: "Inbox" },
        ]}
      />
      {sec === "agenda" && (
        <>
          {waThreads.map((t) => (
            <Tile key={t.id}>
              <Label>WhatsApp</Label>
              <Body>{t.name}</Body>
              <Muted>{t.preview}</Muted>
            </Tile>
          ))}
          <Label>Usage · auto deep-work</Label>
          <View style={{ flexDirection: "row", height: 48, alignItems: "flex-end", gap: 1 }}>
            {usage.map((v, h) => (
              <View
                key={h}
                style={{
                  flex: 1,
                  height: Math.max(8, (v / 14) * 48),
                  backgroundColor: peaks.includes(h) ? colors.accent : colors.elevated,
                  borderRadius: 1,
                }}
              />
            ))}
          </View>
          {blocks.map((b) => {
            const inviter = b.invitedBy ? people.find((p) => p.id === b.invitedBy) : null;
            const canMut = canMutateCalendar(actorId, b.ownerId, "delete");
            return (
              <Tile key={b.id}>
                <Label>{rangeLabel(b.start, b.end)}</Label>
                <Body>{b.title}</Body>
                <Muted>
                  {b.kind}
                  {b.shortened ? " · shortened" : ""}
                  {inviter ? ` · ${inviter.shortName}` : ""} · {b.status}
                </Muted>
                {b.status === "pending" && b.ownerId === actorId ? (
                  <>
                    <Btn label="Accept" onPress={() => run("work.calendar.accept", { id: b.id }, "Accepted")} />
                    <Btn label="Decline" dim onPress={() => run("work.calendar.decline", { id: b.id }, "Declined")} />
                  </>
                ) : null}
                {canMut && b.status === "confirmed" ? (
                  <Btn label="Delete" dim onPress={() => run("work.calendar.delete", { id: b.id })} />
                ) : null}
              </Tile>
            );
          })}
          <Label>Reminders</Label>
          {reminders
            .filter((r) => r.ownerId === SELF_ID || r.ownerId === actorId)
            .map((r) => (
              <Muted key={r.id}>
                {r.title} · {formatTime(r.when)}
              </Muted>
            ))}
        </>
      )}
      {sec === "tasks" && (
        <>
          {mode === "low" && actorId === SELF_ID ? <Muted>Low-energy day. Two tiny tasks. Everything else is parked.</Muted> : null}
          <Field value={taskTitle} onChange={setTaskTitle} placeholder="Add a task" />
          <Btn
            label="Add"
            onPress={() => {
              if (!taskTitle.trim()) return;
              run("work.task.add", { title: taskTitle.trim(), ownerId: SELF_ID, tiny: true }, "Added");
              setTaskTitle("");
            }}
          />
          {mine.primary.map((t) => (
            <Tile key={t.id} onPress={() => run("work.task.toggle", { id: t.id })}>
              <Body>
                {t.done ? "☑ " : "☐ "}
                {t.title}
              </Body>
              {t.tiny ? <Muted>tiny</Muted> : null}
            </Tile>
          ))}
          {mine.rest.length > 0 ? <Label>Parked</Label> : null}
          {mine.rest.map((t) => (
            <Muted key={t.id}>{t.title}</Muted>
          ))}
        </>
      )}
      {sec === "mail" &&
        emails.map((e) => (
          <Tile key={e.id} onPress={() => run("work.email.read", { id: e.id })}>
            <Label>
              {e.fromName} · {e.mailbox}
              {e.source === "google" ? " · Google" : ""}
            </Label>
            <Body>{e.subject}</Body>
            <Muted>{e.preview}</Muted>
            {e.unread ? <Muted>Unread</Muted> : null}
          </Tile>
        ))}
    </Screen>
  );
}

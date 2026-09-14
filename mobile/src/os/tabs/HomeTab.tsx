import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import { useAppStore } from "@/spine/store";
import { formatDay, formatTime, todayKey } from "@/spine/format";
import { dayInsights, dueSoonTotal, personalCash, workMode } from "@/spine/rules";
import { SHELF_TABS, SELF_ID, TAB_LABELS, type TabId } from "@/spine/types";
import { useDelhiWeather } from "@/spine/weather";
import { Body, Btn, Label, Muted, Screen, Tile } from "../ui";

export function HomeTab() {
  const setTab = useAppStore((s) => s.setTab);
  const act = useAppStore((s) => s.act);
  const calendar = useAppStore((s) => s.calendar);
  const tasks = useAppStore((s) => s.tasks);
  const reminders = useAppStore((s) => s.reminders);
  const adherence = useAppStore((s) => s.adherence);
  const suggestions = useAppStore((s) => s.suggestions);
  const bills = useAppStore((s) => s.bills);
  const people = useAppStore((s) => s.people);
  const locations = useAppStore((s) => s.locations);
  const checkins = useAppStore((s) => s.checkins);
  const weather = useDelhiWeather();
  const insight = dayInsights(useAppStore.getState(), weather);
  const mode = workMode({ checkins });
  const day = todayKey();
  const blocks = calendar
    .filter((c) => c.ownerId === SELF_ID && c.status !== "declined" && todayKey(c.start) === day)
    .sort((a, b) => a.start - b.start);
  const pendingTasks = tasks.filter((t) => t.ownerId === SELF_ID && !t.done);
  const shown = mode === "low" ? pendingTasks.filter((t) => t.tiny).slice(0, 4) : pendingTasks.slice(0, 5);
  const upcoming = reminders.filter((r) => !r.fired && r.ownerId === SELF_ID).slice(0, 4);
  const pendingAdh = adherence.filter((a) => !a.taken && !a.missed);
  const dueBill = bills.find((b) => b.status === "due");
  const cash = personalCash(useAppStore.getState());
  const due = dueSoonTotal(useAppStore.getState());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function run(type: string, payload: Record<string, unknown>, ok: string) {
    const r = act(type, payload);
    if (r.ok) Alert.alert(ok);
    else Alert.alert("Couldn’t", r.error ?? "Failed");
  }

  return (
    <Screen title="Today" subtitle={`${formatDay(now)} · ${weather.place}`}>
      <Tile>
        <Label>Now</Label>
        <Text style={{ color: "#f4f4f5", fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "600" }}>{formatTime(now)}</Text>
        <Body>
          {weather.tempC}° {weather.label} · {weather.prediction}
        </Body>
        <Muted>
          High {weather.highC}° · Low {weather.lowC}° · AQI {weather.aqi}
        </Muted>
      </Tile>

      {pendingAdh[0] || dueBill || blocks.some((b) => b.status === "pending") ? (
        <Tile>
          <Label>Needs you</Label>
          {blocks
            .filter((b) => b.status === "pending")
            .map((b) => (
              <Btn key={b.id} label={`Accept ${b.title}`} onPress={() => run("work.calendar.accept", { id: b.id }, "Accepted")} />
            ))}
          {pendingAdh.slice(0, 2).map((a) => (
            <Btn key={a.id} label={`${a.name} taken?`} onPress={() => run("health.adherence.log", { itemId: a.id, taken: true }, "Logged")} />
          ))}
          {dueBill ? (
            <Btn label={`Queue ${dueBill.name}`} onPress={() => run("finance.bill.queue", { id: dueBill.id }, "Queued")} />
          ) : null}
        </Tile>
      ) : null}

      <Tile onPress={() => setTab("growth")}>
        <Label>Insights</Label>
        <Body>{insight.headline}</Body>
        {insight.points.slice(0, 3).map((p) => (
          <Muted key={p}>{p}</Muted>
        ))}
      </Tile>

      <Tile onPress={() => setTab("work")}>
        <Label>Tasks</Label>
        {shown.map((t) => (
          <Btn
            key={t.id}
            dim={t.done}
            label={t.title}
            onPress={() => run("work.task.toggle", { id: t.id }, t.done ? "Reopened" : "Done")}
          />
        ))}
        {shown.length === 0 ? <Muted>Clear.</Muted> : null}
      </Tile>

      <Tile onPress={() => setTab("work")}>
        <Label>Calendar</Label>
        {blocks.slice(0, 4).map((b) => (
          <Body key={b.id}>
            {formatTime(b.start)} · {b.title}
          </Body>
        ))}
        {upcoming.map((r) => (
          <Muted key={r.id}>{r.title}</Muted>
        ))}
      </Tile>

      <Tile onPress={() => setTab("finance")}>
        <Label>Cash</Label>
        <Body>Personal {Math.round(cash).toLocaleString("en-IN")}</Body>
        <Muted>Due soon {Math.round(due).toLocaleString("en-IN")}</Muted>
      </Tile>

      <Tile>
        <Label>Shelf</Label>
        {SHELF_TABS.map((id) => (
          <Btn key={id} label={TAB_LABELS[id as TabId]} onPress={() => setTab(id)} />
        ))}
      </Tile>

      <Tile>
        <Label>Family</Label>
        {locations.map((loc) => {
          const p = people.find((x) => x.id === loc.personId);
          return (
            <Body key={loc.personId}>
              {p?.name ?? loc.personId} · {loc.label}
            </Body>
          );
        })}
        {locations.length === 0 ? <Muted>No pings yet.</Muted> : null}
      </Tile>
    </Screen>
  );
}

import { at, todayKey, weekdayShort } from "./format";
import type { Domain, Suggestion } from "./types";
import { SELF_ID } from "./types";
import type { WeatherSnap } from "./weather";

export function workMode(state: Pick<Domain, "checkins">): "low" | "hyper" | "normal" {
  const c = state.checkins[0];
  if (!c) return "normal";
  if (c.energy <= 2) return "low";
  if (c.energy >= 4 && c.stress <= 2) return "hyper";
  return "normal";
}

export function peakHours(state: Pick<Domain, "usageByHour">) {
  const ranked = state.usageByHour.map((v, h) => ({ h, v })).sort((a, b) => b.v - a.v);
  return ranked.slice(0, 4).map((x) => x.h).sort((a, b) => a - b);
}

export function personalCash(state: Domain) {
  return state.accounts.find((a) => a.id === "acc-check")?.balanceInr ?? 0;
}

export function dueSoonTotal(state: Domain) {
  return state.bills.filter((b) => b.status !== "paid").reduce((s, b) => s + b.amountInr, 0);
}

export type DayInsight = {
  headline: string;
  points: string[];
  mode: "low" | "hyper" | "normal";
};

export function dayInsights(state: Domain, weather?: WeatherSnap): DayInsight {
  const mode = workMode(state);
  const stream = state.streams.find((s) => s.source === "ultrahuman") ?? state.streams[0];
  const peaks = peakHours(state);
  const today = todayKey();
  const blocks = state.calendar.filter((c) => c.ownerId === SELF_ID && c.status !== "declined" && todayKey(c.start) === today);
  const pending = blocks.filter((c) => c.status === "pending");
  const tasks = state.tasks.filter((t) => t.ownerId === SELF_ID && !t.done);
  const adh = state.adherence.filter((a) => !a.taken && !a.missed);
  const wd = weekdayShort();
  const session = state.workout.days.find((d) => d.day === wd);
  const peakLabel = peaks.length ? `${peaks[0]}–${peaks[peaks.length - 1] + 1}h` : "unset";

  let headline = "Run the day as planned. Peak hours are already on the calendar.";
  if (mode === "low") {
    headline = "Sleep debt. Two tiny tasks only. Protect the morning deep-work window and drop the last set tonight.";
  } else if (stream && stream.stress >= 70 && blocks.length >= 4) {
    headline = "High stress, stacked afternoon. Place a 10-minute reset before the vendor call and keep the evening session short.";
  } else if (weather && weather.pop >= 50) {
    headline = "Rain on the board. Keep the gym indoor and do the hard brief in the peak window.";
  } else if (weather && weather.highC >= 35) {
    headline = "Heat outside. Load the brief into the peak window and keep the pull session indoor.";
  } else if (mode === "hyper") {
    headline = "Energy is up. Load the hard brief into the peak window and leave pickup on time.";
  }

  const points: string[] = [];
  if (stream) {
    points.push(`Engine read: stress ${stream.stress} · sleep ${stream.sleepHours.toFixed(1)}h · recovery ${stream.recovery} · HRV ${stream.hrv}.`);
  }
  if (weather) {
    points.push(`Delhi ${weather.tempC}° ${weather.label.toLowerCase()}. ${weather.advice}`);
  }
  points.push(`Usage peaks ${peakLabel}. ${blocks.length} blocks today${pending.length ? `, ${pending.length} still need confirm` : ""}.`);
  if (mode === "low") {
    points.push(`${tasks.filter((t) => t.tiny).length || 2} tiny tasks on the board. Everything else is parked — not failed.`);
  } else {
    points.push(`${tasks.length} open tasks. Do the brief in the peak window, not after pickup.`);
  }
  if (session) {
    const extra = weather?.highC && weather.highC >= 35 ? " Indoor today." : weather && weather.pop >= 40 ? " Indoor if it opens up." : "";
    points.push(`Workout is ${session.focus.toLowerCase()} (${state.workout.notes.split(".")[0]}).${extra}`);
  }
  if (adh.length) {
    points.push(`Protocol still open: ${adh.map((a) => a.name).join(", ")}.`);
  }
  return { headline, points: points.slice(0, 5), mode };
}

export function cashflowFor(state: Domain, amount: number) {
  const personal = personalCash(state);
  const due = dueSoonTotal(state);
  const leftover = personal - due - amount;
  return {
    ok: leftover >= 25000,
    personal,
    due,
    leftover,
    amount,
    message: leftover >= 25000
      ? `Checking covers this. ~${Math.round(leftover / 1000)}k buffer after bills.`
      : `Short. Checking is ${Math.round(personal / 1000)}k, bills due ${Math.round(due / 1000)}k. This ${Math.round(amount / 1000)}k does not fit without savings.`,
  };
}

export function evaluateRules(state: Domain): Suggestion[] {
  const out: Suggestion[] = [];
  const dismissed = new Set(state.dismissedSuggestionIds);
  const stream = state.streams.find((s) => s.source === "ultrahuman") ?? state.streams[0];
  const todayCals = state.calendar.filter(
    (c) => c.status !== "declined" && todayKey(c.start) === todayKey(),
  );
  const hasMeditation = state.calendar.some((c) => /meditation|nidra/i.test(c.title));

  if (stream && stream.stress >= 70 && todayCals.length >= 4 && !hasMeditation && !dismissed.has("sugg-meditate")) {
    out.push({
      id: "sugg-meditate",
      title: "10-minute reset",
      body: "Stress is high and the afternoon is stacked. Yoga Nidra from Growth drops in at 1:40, after lunch, before the vendor call.",
      reason: `UltraHuman stress ${stream.stress} · ${todayCals.length} blocks today`,
      source_tabs: ["health", "growth", "work"],
      actions: [
        {
          label: "Place 1:40–1:50 on calendar",
          eventType: "suggestion.accept",
          payload: {
            suggestionId: "sugg-meditate",
            then: "work.calendar.propose",
            title: "10-min Yoga Nidra",
            start: at(13, 40),
            end: at(13, 50),
            kind: "health",
            ownerId: SELF_ID,
            confirmed: true,
          },
        },
      ],
    });
  }

  const trip = state.trips.find((t) => t.mode === "personal" && t.status !== "committed");
  if (trip?.estimateInr && !dismissed.has("sugg-trip-cash")) {
    const cf = cashflowFor(state, trip.estimateInr);
    if (!cf.ok) {
      out.push({
        id: "sugg-trip-cash",
        title: "Trip vs cash",
        body: `${trip.destination ?? trip.title}: ${cf.message}`,
        reason: "Finance gate on a planned trip",
        source_tabs: ["travel", "finance"],
        actions: [
          {
            label: "Open travel",
            eventType: "suggestion.open",
            payload: { suggestionId: "sugg-trip-cash", tab: "travel" },
          },
        ],
      });
    }
  }

  const dueBill = state.bills.find((b) => b.status === "due");
  if (dueBill && !dismissed.has("sugg-bill")) {
    out.push({
      id: "sugg-bill",
      title: `${dueBill.name} is due`,
      body: `₹${dueBill.amountInr.toLocaleString("en-IN")} · queue for pay or mark paid.`,
      reason: "Recurring expense",
      source_tabs: ["finance"],
      actions: [
        {
          label: "Queue pay",
          eventType: "finance.bill.queue",
          payload: { id: dueBill.id },
        },
      ],
    });
  }

  return out.filter((s) => !dismissed.has(s.id)).slice(0, 3);
}

export function notificationsForEvent(
  type: string,
  payload: Record<string, unknown>,
  actorId: string,
): Omit<Domain["notifications"][number], "id" | "timestamp" | "read">[] {
  if (type === "work.calendar.propose" && payload.confirmed !== true && payload.ownerId === SELF_ID && actorId !== SELF_ID) {
    return [
      {
        kind: "confirmation",
        title: "Calendar invite",
        body: `${String(payload.title ?? "New block")} needs your accept.`,
        tab: "work",
        action: { label: "Review", eventType: "ui.tab", payload: { tab: "work" } },
      },
    ];
  }
  if (type === "health.workout.save") {
    return [
      {
        kind: "reminder",
        title: "Workout plan updated",
        body: "Trainer changed the plan. A reminder is on your Work list.",
        tab: "work",
      },
    ];
  }
  if (type === "health.adherence.log" && payload.taken === true) {
    return [
      {
        kind: "adherence",
        title: "Logged",
        body: "Adherence captured on the health timeline.",
        tab: "health",
      },
    ];
  }
  if (type === "travel.watch") {
    return [
      {
        kind: "alert",
        title: "Watching fares",
        body: "You'll get a ping if the saved trip drops.",
        tab: "travel",
      },
    ];
  }
  return [];
}

import { useState } from "react";
import { Alert } from "react-native";
import { DESTINATIONS } from "@/mocks";
import { useAppStore } from "@/spine/store";
import { formatDay, inr } from "@/spine/format";
import { cashflowFor } from "@/spine/rules";
import { Body, Btn, Field, Label, Muted, Screen, Seg, Tile } from "../ui";

export function TravelTab() {
  const [mode, setMode] = useState<"work" | "personal">("work");
  const trips = useAppStore((s) => s.trips);
  const act = useAppStore((s) => s.act);
  const work = trips.filter((t) => t.mode === "work");
  const personal = trips.filter((t) => t.mode === "personal");
  return (
    <Screen title="Travel" subtitle="Work vs personal. Finance is checked before commit.">
      <Seg
        value={mode}
        onChange={setMode}
        options={[
          { id: "work", label: "Work" },
          { id: "personal", label: "Personal" },
        ]}
      />
      {mode === "work" &&
        work.map((t) => (
          <Tile key={t.id}>
            <Label>
              {t.status}
              {t.source ? ` · ${t.source}` : ""}
            </Label>
            <Body>{t.title}</Body>
            <Muted>{t.destination}</Muted>
            {t.start && t.end ? (
              <Muted>
                {formatDay(t.start)} → {formatDay(t.end)}
              </Muted>
            ) : null}
            {t.rateWatch ? (
              <Muted>
                {t.rateWatch.label}: {inr(t.rateWatch.current)}
              </Muted>
            ) : null}
            {t.packing ? <Muted>Packing: {t.packing.join(", ")}</Muted> : null}
            {t.itinerary?.map((d) => (
              <Muted key={d.day}>
                Day {d.day} · {d.title} — {d.detail}
              </Muted>
            ))}
            <Btn
              label="Keep watching"
              dim
              onPress={() => {
                act("travel.watch", { id: t.id });
                Alert.alert("Watching rates");
              }}
            />
            {t.status !== "committed" ? (
              <Btn
                label="Commit"
                onPress={() => {
                  const r = act("travel.commit", { id: t.id });
                  Alert.alert(r.ok ? "Committed" : r.error ?? "Failed");
                }}
              />
            ) : null}
          </Tile>
        ))}
      {mode === "personal" && <Personal trips={personal} />}
    </Screen>
  );
}

function Personal({ trips }: { trips: ReturnType<typeof useAppStore.getState>["trips"] }) {
  const act = useAppStore((s) => s.act);
  const [vibe, setVibe] = useState(trips[0]?.vibe ?? "beach");
  const [companions, setCompanions] = useState(trips[0]?.companions ?? "Anaya");
  const [season, setSeason] = useState(trips[0]?.season ?? "October");
  const [budget, setBudget] = useState(String(trips[0]?.budgetInr ?? 120000));
  const [dest, setDest] = useState(trips[0]?.destination ?? "");
  const picked = DESTINATIONS.find((d) => d.name === dest) ?? DESTINATIONS[0];
  const cf = cashflowFor(useAppStore.getState(), picked.estimate);
  return (
    <>
      {trips.map((t) => (
        <Tile key={t.id}>
          <Label>{t.source ?? t.status}</Label>
          <Body>{t.title}</Body>
          <Muted>
            {t.destination} · {t.status}
            {t.estimateInr ? ` · ${inr(t.estimateInr)}` : ""}
          </Muted>
        </Tile>
      ))}
      <Field value={vibe} onChange={setVibe} placeholder="Vibe" />
      <Field value={companions} onChange={setCompanions} placeholder="Companions" />
      <Field value={season} onChange={setSeason} placeholder="Season" />
      <Field value={budget} onChange={setBudget} placeholder="Budget INR" keyboard="numeric" />
      {DESTINATIONS.filter((d) => d.vibe === vibe || dest).map((d) => (
        <Tile key={d.name} onPress={() => setDest(d.name)}>
          <Body>{d.name}</Body>
          <Muted>{d.blurb}</Muted>
          <Muted>{inr(d.estimate)}</Muted>
        </Tile>
      ))}
      <Tile>
        <Label>Cash-flow</Label>
        <Muted>{cf.message}</Muted>
      </Tile>
      {picked.itinerary?.map((d) => (
        <Muted key={d.day}>
          Day {d.day} · {d.title} — {d.detail}
        </Muted>
      ))}
      <Btn
        label="Save personal trip"
        onPress={() => {
          const r = act("travel.personal.save", {
            title: `${picked.name} with ${companions}`,
            destination: picked.name,
            vibe,
            companions,
            season,
            budgetInr: Number(budget),
            estimateInr: picked.estimate,
            itinerary: picked.itinerary,
          });
          Alert.alert(r.ok ? "Saved" : r.error ?? "Failed");
        }}
      />
    </>
  );
}

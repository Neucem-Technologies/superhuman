import { useState } from "react";
import { Badge, Button, Card, Field, Input, SectionTitle, Segmented } from "@/components/ui/primitives";
import { DESTINATIONS } from "@/mocks";
import { useAppStore } from "@/spine/store";
import { formatDay, inr } from "@/spine/format";
import { cashflowFor } from "@/spine/rules";
import { toast } from "sonner";
import { SlideHero } from "@/components/shell/SlideHero";

export function TravelTab() {
  const [mode, setMode] = useState<"work" | "personal">("work");
  const trips = useAppStore((s) => s.trips);
  const act = useAppStore((s) => s.act);
  const work = trips.filter((t) => t.mode === "work");
  const personal = trips.filter((t) => t.mode === "personal");

  return (
    <div className="space-y-4">
      <SlideHero slide="travel">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Travel</h1>
        <p className="mt-0.5 text-sm text-foreground/85">Work trips vs personal. Cash-flow is checked against Finance before commit.</p>
      </SlideHero>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { id: "work", label: "Work" },
          { id: "personal", label: "Personal" },
        ]}
      />
      {mode === "work" &&
        work.map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t.title}</p>
              <div className="flex gap-1">
                {t.source === "makemytrip" && <Badge tone="accent">MMT</Badge>}
                {t.source === "airbnb" && <Badge tone="accent">Airbnb</Badge>}
                <Badge tone="accent">{t.status}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted">{t.destination}</p>
            {t.start && t.end && (
              <p className="text-xs text-subtle">
                {formatDay(t.start)} → {formatDay(t.end)}
              </p>
            )}
            {t.rateWatch && (
              <p className="mt-2 text-sm">
                {t.rateWatch.label}: {inr(t.rateWatch.current)}{" "}
                <span className="text-ok">↓ {inr(t.rateWatch.previous - t.rateWatch.current)}</span>
              </p>
            )}
            {t.packing && (
              <p className="mt-2 text-xs text-muted">Packing auto-added to Shopping: {t.packing.join(", ")}</p>
            )}
            <Button size="sm" className="mt-3" variant="secondary" onClick={() => { act("travel.watch", { id: t.id }); toast("Watching rates"); }}>
              Keep watching
            </Button>
          </Card>
        ))}
      {mode === "personal" && <PersonalWizard trips={personal} />}
    </div>
  );
}

function PersonalWizard({ trips }: { trips: ReturnType<typeof useAppStore.getState>["trips"] }) {
  const act = useAppStore((s) => s.act);
  const state = useAppStore.getState();
  const [known, setKnown] = useState<"yes" | "no" | null>(trips[0]?.destination ? "yes" : null);
  const [vibe, setVibe] = useState(trips[0]?.vibe ?? "beach");
  const [companions, setCompanions] = useState(trips[0]?.companions ?? "Anaya");
  const [season, setSeason] = useState(trips[0]?.season ?? "October");
  const [budget, setBudget] = useState(String(trips[0]?.budgetInr ?? 120000));
  const [dest, setDest] = useState(trips[0]?.destination ?? "");
  const picked = DESTINATIONS.find((d) => d.name === (dest || trips[0]?.destination)) ?? DESTINATIONS[0];
  const estimate = picked.estimate;
  const cf = cashflowFor(state, estimate);
  const trip = trips[0];

  return (
    <div className="space-y-3">
      {trips
        .filter((t) => t.source === "airbnb")
        .map((t) => (
          <Card key={t.id}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t.title}</p>
              <Badge tone="accent">Airbnb</Badge>
            </div>
            <p className="text-sm text-muted">{t.destination} · {t.status}</p>
            <p className="text-xs text-subtle">{t.itinerary?.[0]?.detail}</p>
            {t.estimateInr ? <p className="mt-1 font-mono text-xs tabular-nums">{inr(t.estimateInr)}</p> : null}
          </Card>
        ))}
      <SectionTitle>Destination known?</SectionTitle>
      <div className="flex gap-2">
        <Button size="sm" variant={known === "yes" ? "primary" : "secondary"} onClick={() => setKnown("yes")}>
          Yes
        </Button>
        <Button size="sm" variant={known === "no" ? "primary" : "secondary"} onClick={() => setKnown("no")}>
          No
        </Button>
      </div>
      {known === "no" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Vibe">
            <Input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="beach, mountains, city" />
          </Field>
          <Field label="Companions">
            <Input value={companions} onChange={(e) => setCompanions(e.target.value)} />
          </Field>
          <Field label="Season">
            <Input value={season} onChange={(e) => setSeason(e.target.value)} />
          </Field>
          <Field label="Budget (INR)">
            <Input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" />
          </Field>
        </div>
      )}
      <SectionTitle>Suggestions</SectionTitle>
      <div className="space-y-2">
        {DESTINATIONS.filter((d) => d.vibe === vibe || known === "yes").map((d) => (
          <button
            key={d.name}
            type="button"
            onClick={() => setDest(d.name)}
            className={`w-full rounded-md p-3 text-left shadow-border ${dest === d.name ? "bg-elevated" : "bg-surface"}`}
          >
            <p className="text-sm font-medium">{d.name}</p>
            <p className="text-xs text-muted">{d.blurb}</p>
            <p className="mt-1 font-mono text-xs tabular-nums">{inr(d.estimate)}</p>
          </button>
        ))}
      </div>
      {picked && (
        <Card>
          <p className="text-sm font-medium">Sample itinerary · {picked.name}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {picked.itinerary.map((d) => (
              <li key={d.day}>
                Day {d.day}: {d.title} — {d.detail}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card className={cf.ok ? "" : "shadow-[0_0_0_1px_rgba(196,164,116,0.4)]"}>
        <p className="text-xs uppercase tracking-wide text-subtle">Finance gate</p>
        <p className="mt-1 text-sm">{cf.message}</p>
        <p className="text-xs text-muted">
          Personal {inr(cf.personal)} · bills due {inr(cf.due)} · trip {inr(cf.amount)}
        </p>
      </Card>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            act("travel.personal.save", {
              title: `${picked.name} with ${companions}`,
              destination: picked.name,
              vibe,
              companions,
              season,
              budgetInr: Number(budget),
              estimateInr: estimate,
              itinerary: picked.itinerary,
            });
            toast("Saved as suggested");
          }}
        >
          Save suggestion
        </Button>
        {trip && (
          <Button
            onClick={() => {
              act("travel.commit", { id: trip.id });
              toast(cf.ok ? "Committed" : "Committed with a cash-flow warning");
            }}
          >
            Commit
          </Button>
        )}
      </div>
    </div>
  );
}

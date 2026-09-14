import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Field, Input, SectionTitle, Segmented, Textarea } from "@/components/ui/primitives";
import { useAppStore, personById } from "@/spine/store";
import { calcPeptide, peptideSummary } from "@/spine/peptide";
import { formatDay, formatShortDay, todayKey } from "@/spine/format";
import { healthFilter } from "@/spine/permissions";
import { toast } from "sonner";
import { SlideHero } from "@/components/shell/SlideHero";

type Sec = "overview" | "records" | "meds" | "peptide" | "body" | "mind" | "workout";

export function HealthTab() {
  const actorId = useAppStore((s) => s.actorId);
  const filter = healthFilter(useAppStore.getState(), actorId);
  const options: { id: Sec; label: string }[] =
    filter === "workout"
      ? [
          { id: "workout", label: "Workout" },
          { id: "body", label: "Body" },
        ]
      : [
          { id: "overview", label: "Overview" },
          { id: "records", label: "Records" },
          { id: "meds", label: "Meds" },
          { id: "peptide", label: "Peptide" },
          { id: "body", label: "Body" },
          { id: "mind", label: "Mind" },
          { id: "workout", label: "Workout" },
        ];
  const [sec, setSec] = useState<Sec>(options[0].id);
  useEffect(() => {
    if (filter === "workout" && sec !== "workout" && sec !== "body") setSec("workout");
  }, [filter, sec]);

  return (
    <div className="space-y-4">
      <SlideHero slide="health">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Health</h1>
        <p className="mt-0.5 text-sm text-foreground/85">
          {filter === "workout" ? "Workout-related only. No medical records." : "Records, streams, protocol. Observational — nothing prescribed here."}
        </p>
      </SlideHero>
      <Segmented value={sec} onChange={setSec} options={options} />
      {sec === "overview" && <Overview />}
      {sec === "records" && <Records />}
      {sec === "meds" && <Meds />}
      {sec === "peptide" && <Peptide />}
      {sec === "body" && <Body />}
      {sec === "mind" && <Mind />}
      {sec === "workout" && <Workout />}
    </div>
  );
}

function Overview() {
  const streams = useAppStore((s) => s.streams);
  const timeline = useAppStore((s) => s.timeline);
  const checkins = useAppStore((s) => s.checkins);
  const apple = useAppStore((s) => s.connectors?.find((c) => c.id === "apple-health"));
  const ultra = useAppStore((s) => s.connectors?.find((c) => c.id === "ultrahuman"));
  const fitbit = useAppStore((s) => s.connectors?.find((c) => c.id === "fitbit"));
  const act = useAppStore((s) => s.act);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-4">
        {streams.map((s) => (
          <Card key={s.source} className="col-span-3 sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-subtle">
              {s.source === "apple" ? "Apple Health" : s.source === "fitbit" ? "Fitbit" : "UltraHuman"}
            </p>
            <p className="mt-2 font-mono text-lg tabular-nums">{s.recovery}</p>
            <p className="text-xs text-muted">recovery · HRV {s.hrv} · RHR {s.rhr}</p>
            <p className="text-xs text-muted">sleep {s.sleepHours.toFixed(1)}h · stress {s.stress}</p>
            {s.sleepScore != null && (
              <p className="text-xs text-muted">
                score {s.sleepScore} · deep {s.deepSleepH?.toFixed(1)}h · REM {s.remSleepH?.toFixed(1)}h
              </p>
            )}
            {s.glucoseMgDl != null && <p className="text-xs text-muted">glucose {s.glucoseMgDl} mg/dL · SpO₂ {s.spo2}%</p>}
            {s.source === "apple" && apple?.status === "connected" && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => {
                  const r = act("connector.sync", { id: "apple-health" });
                  if (r.ok) toast("Apple Health synced");
                  else toast.error(r.error);
                }}
              >
                Sync
              </Button>
            )}
            {s.source === "ultrahuman" && ultra?.status === "connected" && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => {
                  const r = act("connector.sync", { id: "ultrahuman" });
                  if (r.ok) toast("UltraHuman synced");
                  else toast.error(r.error);
                }}
              >
                Sync
              </Button>
            )}
            {s.source === "fitbit" && fitbit?.status === "connected" && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => {
                  const r = act("connector.sync", { id: "fitbit" });
                  if (r.ok) toast("Fitbit synced");
                  else toast.error(r.error);
                }}
              >
                Sync
              </Button>
            )}
          </Card>
        ))}
      </div>
      {checkins[0] && (
        <Card>
          <p className="text-xs text-subtle">Today’s check-in</p>
          <p className="text-sm">
            mood {checkins[0].mood}/5 · energy {checkins[0].energy}/5 · anxiety {checkins[0].anxiety}/5 · stress {checkins[0].stress}/5
          </p>
        </Card>
      )}
      <SectionTitle>Health timeline</SectionTitle>
      <ul className="space-y-2">
        {timeline
          .filter((e) => e.source_tab === "health")
          .slice(0, 8)
          .map((e) => (
            <li key={e.id} className="flex justify-between gap-3 text-sm">
              <span className="text-muted">{e.type.replace("health.", "")}</span>
              <span className="shrink-0 text-xs text-subtle">{formatShortDay(e.timestamp)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

function Records() {
  const records = useAppStore((s) => s.records);
  const people = useAppStore((s) => s.people);
  const act = useAppStore((s) => s.act);
  const actorId = useAppStore((s) => s.actorId);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const canAdd = healthFilter(useAppStore.getState(), actorId) === "full";
  return (
    <div className="space-y-3">
      {records.map((r) => (
        <Card key={r.id}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{r.title}</p>
            <Badge>{r.kind}</Badge>
          </div>
          <p className="mt-1 text-xs text-subtle">
            {formatDay(r.date)} · {people.find((p) => p.id === r.authorId)?.name}
          </p>
          <p className="mt-2 text-sm text-muted">{r.summary}</p>
        </Card>
      ))}
      {canAdd && (
        <Card>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">Add note</p>
          <div className="space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Clinical note" />
            <Button
              size="sm"
              onClick={() => {
                if (!title.trim()) return;
                const r = act("health.note.add", { title, summary });
                if (!r.ok) toast.error(r.error);
                else {
                  toast("Note on the health timeline");
                  setTitle("");
                  setSummary("");
                }
              }}
            >
              Save note
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Meds() {
  const adherence = useAppStore((s) => s.adherence);
  const act = useAppStore((s) => s.act);
  return (
    <div className="space-y-2">
      {adherence.map((a) => (
        <Card key={a.id} className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{a.name}</p>
            <p className="text-xs text-muted">{a.dose}</p>
          </div>
          {a.taken ? (
            <Badge tone="ok">taken</Badge>
          ) : (
            <Button size="sm" onClick={() => act("health.adherence.log", { itemId: a.id, taken: true })}>
              Taken?
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}

function Peptide() {
  const vial = useAppStore((s) => s.vials[0]);
  const act = useAppStore((s) => s.act);
  const [powder, setPowder] = useState(String(vial?.powderMg ?? 5));
  const [vol, setVol] = useState(String(vial?.vialVolumeMl ?? 2));
  const [syr, setSyr] = useState(String(vial?.syringeVolumeMl ?? 1));
  const [dose, setDose] = useState(String(vial?.targetDoseMcg ?? 250));
  const [pre, setPre] = useState(vial?.premixedConcentrationMcgPerMl ? String(vial.premixedConcentrationMcgPerMl) : "");

  const taken = vial?.history.filter((h) => h.taken).length ?? 0;
  const result = useMemo(
    () =>
      calcPeptide(
        {
          powderMg: Number(powder) || 0,
          vialVolumeMl: Number(vol) || 1,
          syringeVolumeMl: Number(syr) || 1,
          syringeUnits: 100,
          targetDoseMcg: Number(dose) || 1,
          premixedConcentrationMcgPerMl: pre ? Number(pre) : undefined,
        },
        taken,
      ),
    [powder, vol, syr, dose, pre, taken],
  );

  if (!vial) return null;
  return (
    <div className="space-y-3">
      <Card>
        <p className="text-sm font-medium">{vial.name}</p>
        <p className="text-xs text-muted">Started {formatDay(vial.startDate)} · U-100 syringe</p>
        <p className="mt-2 font-mono text-sm tabular-nums">{peptideSummary(result)}</p>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Powder (mg)">
          <Input value={powder} onChange={(e) => setPowder(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Vial volume (ml)">
          <Input value={vol} onChange={(e) => setVol(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Syringe (ml)">
          <Input value={syr} onChange={(e) => setSyr(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Target dose (mcg)">
          <Input value={dose} onChange={(e) => setDose(e.target.value)} inputMode="decimal" />
        </Field>
        <Field label="Pre-mixed mcg/ml (opt.)">
          <Input value={pre} onChange={(e) => setPre(e.target.value)} inputMode="decimal" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Concentration" value={`${Math.round(result.concentrationMcgPerMl)}`} unit="mcg/ml" />
        <Stat label="Draw" value={result.unitsToDraw.toFixed(1)} unit="units" />
        <Stat label="Leftover" value={String(result.leftoverDoses)} unit="doses" />
      </div>
      <Button
        onClick={() => {
          act("health.peptide.save", {
            id: vial.id,
            powderMg: Number(powder),
            vialVolumeMl: Number(vol),
            syringeVolumeMl: Number(syr),
            syringeUnits: 100,
            targetDoseMcg: Number(dose),
            premixedConcentrationMcgPerMl: pre ? Number(pre) : undefined,
          });
          toast("Vial math saved · homepage card uses these units");
        }}
      >
        Save vial
      </Button>
      <SectionTitle>Daily log</SectionTitle>
      <ul className="space-y-1">
        {vial.history.map((h) => (
          <li key={h.date} className="flex justify-between text-sm">
            <span className="tabular-nums">{h.date}</span>
            <Badge tone={h.taken ? "ok" : "warn"}>{h.taken ? "taken" : "open"}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card>
      <p className="text-xs text-subtle">{label}</p>
      <p className="font-mono text-lg tabular-nums">{value}</p>
      <p className="text-xs text-muted">{unit}</p>
    </Card>
  );
}

function Body() {
  const metrics = useAppStore((s) => s.metrics);
  const act = useAppStore((s) => s.act);
  const [w, setW] = useState("");
  const [waist, setWaist] = useState("");
  return (
    <div className="space-y-3">
      {metrics.map((m) => (
        <Card key={m.date} className="flex justify-between text-sm">
          <span className="tabular-nums text-muted">{m.date}</span>
          <span className="font-mono tabular-nums">
            {m.weightKg} kg{m.waistCm ? ` · ${m.waistCm} cm` : ""}
          </span>
        </Card>
      ))}
      <div className="flex gap-2">
        <Input value={w} onChange={(e) => setW(e.target.value)} placeholder="kg" inputMode="decimal" />
        <Input value={waist} onChange={(e) => setWaist(e.target.value)} placeholder="waist cm" inputMode="decimal" />
        <Button
          onClick={() => {
            if (!w) return;
            act("health.measurement.add", { weightKg: Number(w), waistCm: waist ? Number(waist) : undefined });
            setW("");
            setWaist("");
          }}
        >
          Log
        </Button>
      </div>
    </div>
  );
}

function Mind() {
  const checkins = useAppStore((s) => s.checkins);
  const act = useAppStore((s) => s.act);
  const today = checkins.find((c) => c.date === todayKey());
  const [mood, setMood] = useState(today?.mood ?? 3);
  const [energy, setEnergy] = useState(today?.energy ?? 3);
  const [anxiety, setAnxiety] = useState(today?.anxiety ?? 3);
  const [stress, setStress] = useState(today?.stress ?? 3);
  const [sleep, setSleep] = useState(String(today?.sleepHours ?? 6));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Observational only. Nothing here diagnoses or treats.</p>
      <Scale label="Mood" value={mood} onChange={setMood} />
      <Scale label="Energy" value={energy} onChange={setEnergy} />
      <Scale label="Anxiety" value={anxiety} onChange={setAnxiety} />
      <Scale label="Stress" value={stress} onChange={setStress} />
      <Field label="Sleep hours">
        <Input value={sleep} onChange={(e) => setSleep(e.target.value)} inputMode="decimal" />
      </Field>
      <Button
        onClick={() => {
          act("health.checkin.save", { mood, energy, anxiety, stress, sleepHours: Number(sleep) });
          toast("Check-in saved");
        }}
      >
        Save check-in
      </Button>
    </div>
  );
}

function Scale({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted">
        {label} · {value}/5
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-8 flex-1 rounded-sm ${n <= value ? "bg-accent text-accent-foreground" : "bg-elevated text-muted"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Workout() {
  const workout = useAppStore((s) => s.workout);
  const actorId = useAppStore((s) => s.actorId);
  const act = useAppStore((s) => s.act);
  const [notes, setNotes] = useState(workout.notes);
  const trainer = personById(useAppStore.getState(), workout.trainerId);
  const canEdit = actorId === workout.trainerId || actorId === "meera";
  return (
    <div className="space-y-3">
      <Card>
        <p className="text-sm font-medium">{workout.title}</p>
        <p className="text-xs text-muted">Trainer {trainer?.name}</p>
      </Card>
      {workout.days.map((d) => (
        <Card key={d.day}>
          <p className="text-xs uppercase tracking-wide text-subtle">
            {d.day} · {d.focus}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {d.exercises.map((e) => (
              <li key={e.name} className="flex justify-between">
                <span>{e.name}</span>
                <span className="font-mono text-muted tabular-nums">{e.sets}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Field label="Trainer notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} readOnly={!canEdit} />
      </Field>
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const r = act("health.workout.save", { notes });
              if (!r.ok) toast.error(r.error);
              else toast("Plan saved · reminder on Work");
            }}
          >
            Save plan
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const r = act("work.reminder.add", { title: `Workout · ${workout.days[0]?.focus}`, ownerId: "rajan" });
              if (!r.ok) toast.error(r.error);
              else toast("Reminder on Rajan’s Work");
            }}
          >
            Add Work reminder
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const r = act("work.calendar.propose", {
                title: "Workout · extra",
                start: Date.now() + 86400_000,
                end: Date.now() + 86400_000 + 3600_000,
                kind: "workout",
                ownerId: "rajan",
              });
              if (!r.ok) toast.error(r.error);
              else toast("Invite sent · needs his confirm");
            }}
          >
            Propose calendar slot
          </Button>
        </div>
      )}
    </div>
  );
}

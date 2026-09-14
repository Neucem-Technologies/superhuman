import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useAppStore, personById } from "@/spine/store";
import { calcPeptide, peptideSummary } from "@/spine/peptide";
import { formatDay, formatShortDay, todayKey } from "@/spine/format";
import { healthFilter } from "@/spine/permissions";
import { health } from "../../health/HealthBridge";
import { useHealth } from "../../health/useHealth";
import { Body, Btn, Field, Label, Muted, Scale, Screen, Seg, Tile } from "../ui";

type Sec = "overview" | "phone" | "records" | "meds" | "peptide" | "body" | "mind" | "workout";

export function HealthTab() {
  const actorId = useAppStore((s) => s.actorId);
  const filter = healthFilter(useAppStore.getState(), actorId);
  const options: { id: Sec; label: string }[] =
    filter === "workout"
      ? [
          { id: "workout", label: "Workout" },
          { id: "body", label: "Body" },
          { id: "phone", label: "Phone" },
        ]
      : [
          { id: "overview", label: "Overview" },
          { id: "phone", label: "Phone" },
          { id: "records", label: "Records" },
          { id: "meds", label: "Meds" },
          { id: "peptide", label: "Peptide" },
          { id: "body", label: "Body" },
          { id: "mind", label: "Mind" },
          { id: "workout", label: "Workout" },
        ];
  const [sec, setSec] = useState<Sec>(options[0].id);
  useEffect(() => {
    if (filter === "workout" && sec !== "workout" && sec !== "body" && sec !== "phone") setSec("workout");
  }, [filter, sec]);

  return (
    <Screen
      title="Health"
      subtitle={filter === "workout" ? "Workout-related only. No medical records." : "Records, streams, protocol. Observational."}
    >
      <Seg value={sec} onChange={setSec} options={options} />
      {sec === "overview" && <Overview />}
      {sec === "phone" && <Phone />}
      {sec === "records" && <Records />}
      {sec === "meds" && <Meds />}
      {sec === "peptide" && <Peptide />}
      {sec === "body" && <BodyMetrics />}
      {sec === "mind" && <Mind />}
      {sec === "workout" && <Workout />}
    </Screen>
  );
}

function Overview() {
  const streams = useAppStore((s) => s.streams);
  const timeline = useAppStore((s) => s.timeline);
  const checkins = useAppStore((s) => s.checkins);
  const act = useAppStore((s) => s.act);
  return (
    <>
      {streams.map((s) => (
        <Tile key={s.source}>
          <Label>{s.source === "apple" ? "Apple Health" : s.source === "fitbit" ? "Fitbit" : "UltraHuman"}</Label>
          <Body>recovery {s.recovery}</Body>
          <Muted>
            HRV {s.hrv} · RHR {s.rhr} · sleep {s.sleepHours.toFixed(1)}h · stress {s.stress} · {s.steps} steps
          </Muted>
          {s.sleepScore != null ? (
            <Muted>
              score {s.sleepScore} · deep {s.deepSleepH?.toFixed(1)}h · REM {s.remSleepH?.toFixed(1)}h
            </Muted>
          ) : null}
          {s.glucoseMgDl != null ? (
            <Muted>
              glucose {s.glucoseMgDl} mg/dL · SpO₂ {s.spo2}%
            </Muted>
          ) : null}
          <Btn
            label="Sync"
            onPress={() => {
              const id = s.source === "apple" ? "apple-health" : s.source;
              const r = act("connector.sync", { id });
              Alert.alert(r.ok ? "Synced" : r.error ?? "Failed");
            }}
          />
        </Tile>
      ))}
      {checkins[0] ? (
        <Tile>
          <Label>Today’s check-in</Label>
          <Body>
            mood {checkins[0].mood}/5 · energy {checkins[0].energy}/5 · anxiety {checkins[0].anxiety}/5 · stress {checkins[0].stress}/5
          </Body>
        </Tile>
      ) : null}
      <Label>Health timeline</Label>
      {timeline
        .filter((e) => e.source_tab === "health")
        .slice(0, 8)
        .map((e) => (
          <Muted key={e.id}>
            {e.type.replace("health.", "")} · {formatShortDay(e.timestamp)}
          </Muted>
        ))}
    </>
  );
}

function Phone() {
  const native = useHealth();
  return (
    <>
      <Tile>
        <Label>Device</Label>
        <Body>
          {native.authorized ? "Access on" : "Access off"} · {native.summary?.steps ?? "—"} steps
        </Body>
        <Muted>
          Heart {native.summary?.latestBpm ?? "—"} bpm · {native.summary?.workouts ?? 0} sessions
        </Muted>
        <Btn
          label={native.authorized ? "Refresh" : "Allow Health"}
          onPress={() => void (native.authorized ? native.refresh() : native.request())}
        />
      </Tile>
      {native.error ? <Muted>{native.error}</Muted> : null}
    </>
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
    <>
      {records.map((r) => (
        <Tile key={r.id}>
          <Label>{r.kind}</Label>
          <Body>{r.title}</Body>
          <Muted>
            {formatDay(r.date)} · {people.find((p) => p.id === r.authorId)?.name}
          </Muted>
          <Muted>{r.summary}</Muted>
        </Tile>
      ))}
      {canAdd ? (
        <Tile>
          <Label>Add note</Label>
          <Field value={title} onChange={setTitle} placeholder="Title" />
          <Field value={summary} onChange={setSummary} placeholder="Clinical note" multiline />
          <Btn
            label="Save note"
            onPress={() => {
              if (!title.trim()) return;
              const r = act("health.note.add", { title, summary });
              Alert.alert(r.ok ? "Saved" : r.error ?? "Failed");
              if (r.ok) {
                setTitle("");
                setSummary("");
              }
            }}
          />
        </Tile>
      ) : null}
    </>
  );
}

function Meds() {
  const adherence = useAppStore((s) => s.adherence);
  const act = useAppStore((s) => s.act);
  return (
    <>
      {adherence.map((a) => (
        <Tile key={a.id}>
          <Body>{a.name}</Body>
          <Muted>
            {a.dose}
            {a.taken ? " · taken" : ""}
          </Muted>
          {!a.taken && !a.missed ? (
            <Btn label="Taken?" onPress={() => act("health.adherence.log", { itemId: a.id, taken: true })} />
          ) : null}
        </Tile>
      ))}
    </>
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
  if (!vial) return <Muted>No vial on file.</Muted>;
  return (
    <>
      <Tile>
        <Body>{vial.name}</Body>
        <Muted>Started {formatDay(vial.startDate)} · U-100 syringe</Muted>
        <Body>{peptideSummary(result)}</Body>
      </Tile>
      <Field value={powder} onChange={setPowder} placeholder="Powder mg" keyboard="decimal-pad" />
      <Field value={vol} onChange={setVol} placeholder="Vial ml" keyboard="decimal-pad" />
      <Field value={syr} onChange={setSyr} placeholder="Syringe ml" keyboard="decimal-pad" />
      <Field value={dose} onChange={setDose} placeholder="Target mcg" keyboard="decimal-pad" />
      <Field value={pre} onChange={setPre} placeholder="Pre-mixed mcg/ml (opt.)" keyboard="decimal-pad" />
      <Tile>
        <Muted>Concentration {Math.round(result.concentrationMcgPerMl)} mcg/ml</Muted>
        <Muted>Draw {result.unitsToDraw.toFixed(1)} units</Muted>
        <Muted>Leftover {result.leftoverDoses} doses</Muted>
      </Tile>
      <Btn
        label="Save vial"
        onPress={() => {
          act("health.peptide.save", {
            id: vial.id,
            powderMg: Number(powder),
            vialVolumeMl: Number(vol),
            syringeVolumeMl: Number(syr),
            syringeUnits: 100,
            targetDoseMcg: Number(dose),
            premixedConcentrationMcgPerMl: pre ? Number(pre) : undefined,
          });
          Alert.alert("Vial math saved");
        }}
      />
      {vial.history.map((h) => (
        <Muted key={h.date}>
          {h.date} · {h.taken ? "taken" : "open"}
        </Muted>
      ))}
    </>
  );
}

function BodyMetrics() {
  const metrics = useAppStore((s) => s.metrics);
  const act = useAppStore((s) => s.act);
  const [w, setW] = useState("");
  const [waist, setWaist] = useState("");
  return (
    <>
      {metrics.map((m) => (
        <Tile key={m.date}>
          <Muted>{m.date}</Muted>
          <Body>
            {m.weightKg} kg{m.waistCm ? ` · ${m.waistCm} cm` : ""}
          </Body>
        </Tile>
      ))}
      <Field value={w} onChange={setW} placeholder="kg" keyboard="decimal-pad" />
      <Field value={waist} onChange={setWaist} placeholder="waist cm" keyboard="decimal-pad" />
      <Btn
        label="Log"
        onPress={() => {
          if (!w) return;
          act("health.measurement.add", { weightKg: Number(w), waistCm: waist ? Number(waist) : undefined });
          setW("");
          setWaist("");
        }}
      />
    </>
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
    <>
      <Muted>Observational only. Nothing here diagnoses or treats.</Muted>
      <Scale label="Mood" value={mood} onChange={setMood} />
      <Scale label="Energy" value={energy} onChange={setEnergy} />
      <Scale label="Anxiety" value={anxiety} onChange={setAnxiety} />
      <Scale label="Stress" value={stress} onChange={setStress} />
      <Field value={sleep} onChange={setSleep} placeholder="Sleep hours" keyboard="decimal-pad" />
      <Btn
        label="Save check-in"
        onPress={() => {
          act("health.checkin.save", { mood, energy, anxiety, stress, sleepHours: Number(sleep) });
          Alert.alert("Check-in saved");
        }}
      />
    </>
  );
}

function Workout() {
  const workout = useAppStore((s) => s.workout);
  const actorId = useAppStore((s) => s.actorId);
  const act = useAppStore((s) => s.act);
  const native = useHealth();
  const [notes, setNotes] = useState(workout.notes);
  const trainer = personById(useAppStore.getState(), workout.trainerId);
  const canEdit = actorId === workout.trainerId || actorId === "meera";
  return (
    <>
      <Tile>
        <Body>{workout.title}</Body>
        <Muted>Trainer {trainer?.name}</Muted>
      </Tile>
      {workout.days.map((d) => (
        <Tile key={d.day}>
          <Label>
            {d.day} · {d.focus}
          </Label>
          {d.exercises.map((e) => (
            <Muted key={e.name}>
              {e.name} · {e.sets}
            </Muted>
          ))}
        </Tile>
      ))}
      {canEdit ? (
        <>
          <Field value={notes} onChange={setNotes} placeholder="Trainer notes" multiline />
          <Btn
            label="Save plan"
            onPress={() => {
              const r = act("health.workout.save", { notes });
              Alert.alert(r.ok ? "Plan saved" : r.error ?? "Failed");
            }}
          />
        </>
      ) : (
        <Muted>{workout.notes}</Muted>
      )}
      <Btn
        label="Log 30 min walk to the phone"
        onPress={() => {
          const end = Date.now();
          void health
            .writeWorkout({ activity: "walking", startMs: end - 30 * 60_000, endMs: end, caloriesKcal: 110, distanceM: 2100 })
            .then(
              () => {
                Alert.alert("Saved to Health");
                void native.refresh();
              },
              (e) => Alert.alert("Couldn’t", String(e)),
            );
        }}
      />
      {native.workouts.map((w) => (
        <Tile key={w.id}>
          <Label>Phone</Label>
          <Body>{w.activity}</Body>
          <Muted>{Math.round((w.end - w.start) / 60000)} min</Muted>
        </Tile>
      ))}
    </>
  );
}

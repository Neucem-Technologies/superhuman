import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { health } from "../health/HealthBridge";
import { useHealth } from "../health/useHealth";
import { colors, space } from "../theme";

export function WorkoutScreen() {
  const { workouts, refresh, busy, error } = useHealth();
  const [note, setNote] = useState<string | null>(null);

  async function logWalk() {
    const end = Date.now();
    const start = end - 30 * 60_000;
    const res = await health.writeWorkout({
      activity: "walking",
      startMs: start,
      endMs: end,
      caloriesKcal: 110,
      distanceM: 2100,
    });
    setNote(`Saved ${res.id}`);
    await refresh();
  }

  return (
    <Screen title="Workout" subtitle="Read sessions from Health. Log a 30-minute walk to test write access.">
      <PrimaryButton label="Log 30 min walk" onPress={() => void logWalk()} busy={busy} />
      {note ? <Text style={styles.ok}>{note}</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {workouts.map((w) => (
        <View key={w.id} style={styles.card}>
          <Text style={styles.name}>{w.activity}</Text>
          <Text style={styles.meta}>
            {Math.round((w.end - w.start) / 60000)} min · {w.source}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.elevated, borderRadius: 16, padding: space.md, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: "600", textTransform: "capitalize" },
  meta: { color: colors.muted, fontSize: 13, marginTop: 4 },
  ok: { color: colors.accent, fontSize: 13 },
  err: { color: colors.bad, fontSize: 13 },
});

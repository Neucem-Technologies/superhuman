import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { useHealth } from "../health/useHealth";
import { colors, space } from "../theme";

export function HealthSummaryScreen() {
  const { summary, samples, workouts } = useHealth();
  return (
    <Screen title="Summary" subtitle={summary?.date ?? "Today"}>
      <View style={styles.block}>
        <Text style={styles.label}>Day</Text>
        <Text style={styles.body}>
          {summary?.steps ?? 0} steps · {summary?.workouts ?? 0} workouts · {summary?.activeMinutes ?? 0} active minutes
        </Text>
        <Text style={styles.body}>
          Heart {summary?.latestBpm ?? "—"} bpm
          {summary?.avgBpm ? ` · avg ${summary.avgBpm}` : ""}
          {summary?.restingBpm ? ` · rest ${summary.restingBpm}` : ""}
        </Text>
      </View>
      <Text style={styles.label}>Heart samples</Text>
      {samples.slice(0, 8).map((s) => (
        <Text key={s.at} style={styles.line}>
          {new Date(s.at).toLocaleTimeString()} · {s.bpm} bpm
        </Text>
      ))}
      {samples.length === 0 ? <Text style={styles.muted}>No samples yet today.</Text> : null}
      <Text style={[styles.label, { marginTop: space.md }]}>Sessions</Text>
      {workouts.map((w) => (
        <View key={w.id} style={styles.card}>
          <Text style={styles.name}>{w.activity}</Text>
          <Text style={styles.muted}>
            {new Date(w.start).toLocaleTimeString()} – {new Date(w.end).toLocaleTimeString()}
            {w.caloriesKcal ? ` · ${Math.round(w.caloriesKcal)} kcal` : ""}
            {w.distanceM ? ` · ${(w.distanceM / 1000).toFixed(1)} km` : ""}
          </Text>
        </View>
      ))}
      {workouts.length === 0 ? <Text style={styles.muted}>No workouts logged today.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.elevated, borderRadius: 16, padding: space.md, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.subtle, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: 4 },
  line: { color: colors.text, fontSize: 14, fontVariant: ["tabular-nums"] },
  muted: { color: colors.muted, fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: space.sm, marginTop: 6 },
  name: { color: colors.text, fontSize: 15, fontWeight: "600", textTransform: "capitalize" },
});

import { StyleSheet, Text, View } from "react-native";
import { MetricCard } from "../components/MetricCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { platformLabel, usingNativeBridge } from "../health/HealthBridge";
import { useHealth } from "../health/useHealth";
import { colors, space } from "../theme";

export function DashboardScreen({ onOpenPermissions }: { onOpenPermissions: () => void }) {
  const { summary, busy, error, refresh, authorized } = useHealth();
  return (
    <Screen title="Dashboard" subtitle={`${platformLabel} · ${usingNativeBridge ? "native bridge" : "simulator feed"}`}>
      {!authorized ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>Health access is off. Grant steps, heart rate, and workouts to sync the phone.</Text>
          <PrimaryButton label="Open permissions" onPress={onOpenPermissions} />
        </View>
      ) : null}
      <View style={styles.grid}>
        <MetricCard label="Steps" value={summary ? String(summary.steps) : "—"} hint="Today" />
        <MetricCard
          label="Heart"
          value={summary?.latestBpm ? `${summary.latestBpm}` : "—"}
          hint={summary?.restingBpm ? `rest ${summary.restingBpm} bpm` : "bpm"}
        />
        <MetricCard label="Workouts" value={summary ? String(summary.workouts) : "—"} hint={`${summary?.activeMinutes ?? 0} active min`} />
        <MetricCard label="Calories" value={summary?.caloriesKcal ? String(Math.round(summary.caloriesKcal)) : "—"} hint="from sessions" />
      </View>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <PrimaryButton label={busy ? "Reading…" : "Refresh"} onPress={() => void refresh()} busy={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginVertical: space.sm },
  warn: { backgroundColor: colors.surface, borderRadius: 16, padding: space.md, gap: space.sm, marginBottom: space.sm },
  warnText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  err: { color: colors.bad, fontSize: 13 },
});

import { StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { ALL_PERMISSIONS, platformLabel } from "../health/HealthBridge";
import { useHealth } from "../health/useHealth";
import { colors, space } from "../theme";

const COPY: Record<string, string> = {
  steps: "Step count for Today and Health.",
  heartRate: "Heart samples and resting rate.",
  workout: "Sessions you log or import.",
};

export function PermissionsScreen() {
  const { authorized, request, busy, error } = useHealth();
  return (
    <Screen
      title="Permissions"
      subtitle={`${platformLabel} needs read and write for steps, heart rate, and workouts. Nothing leaves the phone until you sync.`}
    >
      {ALL_PERMISSIONS.map((p) => (
        <View key={p} style={styles.row}>
          <Text style={styles.name}>{p === "heartRate" ? "Heart rate" : p[0].toUpperCase() + p.slice(1)}</Text>
          <Text style={styles.hint}>{COPY[p]}</Text>
        </View>
      ))}
      <Text style={styles.status}>{authorized ? "Access granted." : "Access not granted yet."}</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <PrimaryButton label={authorized ? "Review access" : "Allow Health"} onPress={() => void request()} busy={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.elevated, borderRadius: 16, padding: space.md, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 13, marginTop: 4 },
  status: { color: colors.accent, fontSize: 14, marginTop: space.sm },
  err: { color: colors.bad, fontSize: 13 },
});

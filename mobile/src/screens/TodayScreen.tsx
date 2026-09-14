import { StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { useHealth } from "../health/useHealth";
import { colors } from "../theme";

export function TodayScreen() {
  const { summary } = useHealth();
  const when = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  return (
    <Screen title="Today" subtitle={when}>
      <Text style={styles.hero}>{summary?.steps ?? 0}</Text>
      <Text style={styles.caption}>steps so far</Text>
      <Text style={styles.body}>
        {summary?.workouts ?? 0} session{(summary?.workouts ?? 0) === 1 ? "" : "s"} · heart{" "}
        {summary?.latestBpm ?? "—"} bpm
      </Text>
      <Text style={styles.note}>This companion writes into Apple Health / Health Connect. The LivinSync web OS reads it after you sync on the phone.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { color: colors.text, fontSize: 56, fontWeight: "700", fontVariant: ["tabular-nums"] },
  caption: { color: colors.subtle, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" },
  body: { color: colors.text, fontSize: 18, marginTop: 12 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 16 },
});

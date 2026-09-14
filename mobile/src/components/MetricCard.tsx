import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";

export function MetricCard({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  hint?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress}>{inner}</Pressable>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: space.md,
    minWidth: "47%",
    flexGrow: 1,
  },
  label: { color: colors.subtle, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  value: { color: colors.text, fontSize: 28, fontWeight: "600", marginTop: 6, fontVariant: ["tabular-nums"] },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
});

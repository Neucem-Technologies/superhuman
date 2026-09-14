import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, space } from "../theme";

export function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [styles.btn, (disabled || busy) && styles.dim, pressed && styles.pressed]}
    >
      {busy ? <ActivityIndicator color={colors.accentInk} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  label: { color: colors.accentInk, fontWeight: "700", fontSize: 15 },
  dim: { opacity: 0.5 },
  pressed: { transform: [{ scale: 0.98 }] },
});

import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, space } from "../theme";
import { useDisplay } from "./display";

export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { fontPct, high } = useDisplay();
  const scale = fontPct / 100;
  return (
    <SafeAreaView style={[styles.safe, high && styles.high]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.kicker, { fontSize: 11 * scale }]}>LivinSync</Text>
        <Text style={[styles.title, { fontSize: 28 * scale }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { fontSize: 14 * scale }]}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Tile({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const { fillPct, high } = useDisplay();
  const inner = (
    <View
      style={[
        styles.tile,
        { backgroundColor: high ? "#121214" : `rgba(18,20,28,${fillPct / 100})` },
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {inner}
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Body({ children }: { children: ReactNode }) {
  const { fontPct } = useDisplay();
  return <Text style={[styles.body, { fontSize: 15 * (fontPct / 100) }]}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  const { fontPct } = useDisplay();
  return <Text style={[styles.muted, { fontSize: 13 * (fontPct / 100) }]}>{children}</Text>;
}

export function Btn({
  label,
  onPress,
  dim,
}: {
  label: string;
  onPress: () => void;
  dim?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, dim && styles.dim]}>
      <Text style={styles.btnLabel}>{label}</Text>
    </Pressable>
  );
}

export function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.segBtn, value === o.id && styles.segOn]}>
          <Text style={[styles.segLabel, value === o.id && styles.segLabelOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Field(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboard?: "decimal-pad" | "numeric" | "default";
}) {
  return (
    <TextInput
      value={props.value}
      onChangeText={props.onChange}
      placeholder={props.placeholder}
      placeholderTextColor={colors.subtle}
      multiline={props.multiline}
      keyboardType={props.keyboard === "decimal-pad" ? "decimal-pad" : props.keyboard === "numeric" ? "number-pad" : "default"}
      style={[styles.input, props.multiline && styles.area]}
    />
  );
}

export function Scale({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View>
      <Text style={styles.muted}>
        {label} · {value}/5
      </Text>
      <View style={styles.seg}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n)} style={[styles.segBtn, n <= value && styles.segOn]}>
            <Text style={[styles.segLabel, n <= value && styles.segLabelOn]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  high: { backgroundColor: "#000" },
  scroll: { paddingHorizontal: space.lg, paddingBottom: 28, gap: space.sm },
  kicker: { color: colors.subtle, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  tile: {
    backgroundColor: "rgba(18,20,28,0.3)",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: space.md,
    gap: 4,
  },
  pressed: { opacity: 0.88 },
  label: { color: colors.subtle, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: "700" },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  btnLabel: { color: colors.accentInk, fontWeight: "700", fontSize: 13 },
  dim: { opacity: 0.45 },
  seg: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  segBtn: { backgroundColor: colors.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  segOn: { backgroundColor: colors.text },
  segLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  segLabelOn: { color: colors.bg },
  input: {
    backgroundColor: colors.elevated,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  area: { minHeight: 88, textAlignVertical: "top" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});

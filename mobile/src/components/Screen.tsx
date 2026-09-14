import type { ReactNode } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
}) {
  const body = (
    <View style={styles.inner}>
      <Text style={styles.kicker}>LivinSync</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 28 },
  inner: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  kicker: { color: colors.subtle, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 28, fontWeight: "600" },
  sub: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: space.sm },
});

import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { parseCommands, visibleShortcuts } from "@/spine/commands";
import { useAppStore } from "@/spine/store";
import { colors } from "../theme";
import { Btn } from "./ui";

export function CommandBar() {
  const [text, setText] = useState("");
  const act = useAppStore((s) => s.act);
  const setTab = useAppStore((s) => s.setTab);
  const adherence = useAppStore((s) => s.adherence);
  const suggestions = useAppStore((s) => s.suggestions);
  const bills = useAppStore((s) => s.bills);
  const shortcuts = useAppStore((s) => s.shortcuts);
  const chips = useMemo(
    () => visibleShortcuts(useAppStore.getState()),
    [adherence, suggestions, bills, shortcuts],
  );

  function runPhrase(raw: string) {
    const cmds = parseCommands(raw, useAppStore.getState());
    if (!cmds.length) {
      Alert.alert("Not understood", "Try taken, queue, deep, or briefing.");
      return;
    }
    for (const c of cmds) {
      const r = act(c.type, c.payload);
      if (!r.ok) {
        Alert.alert("Couldn’t", r.error ?? "Failed");
        return;
      }
      if (c.navigate) setTab(c.tab);
      Alert.alert(c.title, c.reply);
    }
  }

  function run() {
    const raw = text.trim();
    if (!raw) return;
    runPhrase(raw);
    setText("");
  }

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((c) => (
          <Pressable key={c.phrase} onPress={() => runPhrase(c.phrase)} style={styles.chip}>
            <Text style={styles.chipLabel}>{c.phrase}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.bar}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="taken · queue · briefing"
          placeholderTextColor={colors.subtle}
          onSubmitEditing={run}
          style={styles.input}
          returnKeyType="go"
        />
        <Btn label="Go" onPress={run} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  chips: { paddingHorizontal: 12, paddingTop: 8, gap: 6, flexDirection: "row" },
  chip: { backgroundColor: colors.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  bar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: colors.elevated,
  },
});

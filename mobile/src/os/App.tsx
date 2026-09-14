import { useState } from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppStore } from "@/spine/store";
import { SHELF_TABS, TAB_LABELS, type TabId } from "@/spine/types";
import { visibleTabs } from "@/spine/permissions";
import { colors } from "../theme";
import { CommandBar } from "./CommandBar";
import { DisplayProvider } from "./display";
import { BusinessesTab } from "./tabs/BusinessesTab";
import { ConnectorsTab } from "./tabs/ConnectorsTab";
import { EnjoyTab } from "./tabs/EnjoyTab";
import { FilesTab } from "./tabs/FilesTab";
import { FinanceTab } from "./tabs/FinanceTab";
import { GrowthTab } from "./tabs/GrowthTab";
import { HealthTab } from "./tabs/HealthTab";
import { HomeTab } from "./tabs/HomeTab";
import { InboxTab } from "./tabs/InboxTab";
import { NotesTab } from "./tabs/NotesTab";
import { SettingsTab } from "./tabs/SettingsTab";
import { ShopTab } from "./tabs/ShopTab";
import { TravelTab } from "./tabs/TravelTab";
import { WorkTab } from "./tabs/WorkTab";

type Extra = "connectors" | "settings" | "inbox";
type Pane = TabId | Extra;

const PRIMARY: TabId[] = ["home", "work", "health", "finance"];
const MORE: TabId[] = ["businesses", ...SHELF_TABS];

export default function App() {
  return (
    <DisplayProvider>
      <OsShell />
    </DisplayProvider>
  );
}

function OsShell() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);
  const actorId = useAppStore((s) => s.actorId);
  const unread = useAppStore((s) => s.notifications.filter((n) => !n.read).length);
  const vis = visibleTabs(useAppStore.getState(), actorId);
  const [overlay, setOverlay] = useState<Extra | null>(null);
  const pane: Pane = overlay ?? activeTab;
  const primary = PRIMARY.filter((t) => vis.includes(t));
  const more = MORE.filter((t) => vis.includes(t));

  function go(id: TabId) {
    setOverlay(null);
    setTab(id);
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <View style={styles.shell}>
        <View style={styles.body}>
          {pane === "home" ? <HomeTab /> : null}
          {pane === "work" ? <WorkTab /> : null}
          {pane === "health" ? <HealthTab /> : null}
          {pane === "finance" ? <FinanceTab /> : null}
          {pane === "businesses" ? <BusinessesTab /> : null}
          {pane === "growth" ? <GrowthTab /> : null}
          {pane === "travel" ? <TravelTab /> : null}
          {pane === "entertainment" ? <EnjoyTab /> : null}
          {pane === "shopping" ? <ShopTab /> : null}
          {pane === "notes" ? <NotesTab /> : null}
          {pane === "files" ? <FilesTab /> : null}
          {pane === "connectors" ? <ConnectorsTab /> : null}
          {pane === "inbox" ? <InboxTab /> : null}
          {pane === "settings" ? (
            <SettingsTab onOpenConnectors={() => setOverlay("connectors")} onOpenInbox={() => setOverlay("inbox")} />
          ) : null}
        </View>
        <CommandBar />
        {overlay != null || more.includes(activeTab) ? (
          <View style={styles.shelf}>
            {more.map((id) => (
              <Pressable key={id} onPress={() => go(id)} style={styles.chip}>
                <Text style={[styles.chipLabel, activeTab === id && overlay == null && styles.on]}>{TAB_LABELS[id]}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setOverlay("connectors")} style={styles.chip}>
              <Text style={[styles.chipLabel, overlay === "connectors" && styles.on]}>Connectors</Text>
            </Pressable>
            <Pressable onPress={() => setOverlay("inbox")} style={styles.chip}>
              <Text style={[styles.chipLabel, overlay === "inbox" && styles.on]}>Inbox{unread ? ` · ${unread}` : ""}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.bar}>
          {primary.map((id) => (
            <Pressable key={id} onPress={() => go(id)} style={styles.tab} accessibilityRole="button">
              <Text style={[styles.tabLabel, pane === id && styles.on]}>{id === "home" ? "Today" : TAB_LABELS[id]}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setOverlay("settings")} style={styles.tab}>
            <Text style={[styles.tabLabel, overlay === "settings" && styles.on]}>More</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: "center" },
  tabLabel: { color: colors.subtle, fontSize: 11, fontWeight: "700" },
  on: { color: colors.accent },
  shelf: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.elevated },
  chipLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
});

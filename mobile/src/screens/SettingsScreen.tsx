import { StyleSheet, Text } from "react-native";
import { Screen } from "../components/Screen";
import { platformLabel, usingNativeBridge } from "../health/HealthBridge";
import { colors } from "../theme";

export function SettingsScreen() {
  return (
    <Screen title="Settings" subtitle="Companion for LivinSync Health.">
      <Text style={styles.row}>Store · {platformLabel}</Text>
      <Text style={styles.row}>Bridge · {usingNativeBridge ? "native" : "mock (JS)"}</Text>
      <Text style={styles.row}>Bundle · com.livinsync.health</Text>
      <Text style={styles.note}>
        Enable the HealthKit entitlement in Xcode (Signing & Capabilities) and Health Connect on the Android device. Then grant
        access on the Permissions tab. Observational only — LivinSync does not prescribe.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { color: colors.text, fontSize: 16, marginBottom: 8 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 12 },
});

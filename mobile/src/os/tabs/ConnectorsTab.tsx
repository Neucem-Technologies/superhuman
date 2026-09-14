import { Alert } from "react-native";
import { CONNECTOR_CATALOG, CONNECTOR_GROUPS } from "@/spine/connectors";
import { useAppStore } from "@/spine/store";
import { Body, Btn, Label, Muted, Screen, Tile } from "../ui";

export function ConnectorsTab() {
  const connectors = useAppStore((s) => s.connectors);
  const act = useAppStore((s) => s.act);
  return (
    <Screen title="Connectors" subtitle="Same catalog as the web OS. Empty keys keep the mock feed.">
      {CONNECTOR_GROUPS.map((g) => (
        <Tile key={g.id}>
          <Label>{g.label}</Label>
          {CONNECTOR_CATALOG.filter((c) => c.group === g.id).map((c) => {
            const row = connectors.find((x) => x.id === c.id);
            return (
              <Tile key={c.id}>
                <Body>{c.label}</Body>
                <Muted>
                  {row?.status === "connected" ? "Connected" : "Off"} · {c.blurb}
                </Muted>
                <Btn
                  label={row?.status === "connected" ? "Sync" : "Connect"}
                  onPress={() => {
                    const type = row?.status === "connected" ? "connector.sync" : "connector.connect";
                    const r = act(type, { id: c.id });
                    Alert.alert(r.ok ? (row?.status === "connected" ? "Synced" : "Connected") : r.error ?? "Failed");
                  }}
                />
              </Tile>
            );
          })}
        </Tile>
      ))}
    </Screen>
  );
}

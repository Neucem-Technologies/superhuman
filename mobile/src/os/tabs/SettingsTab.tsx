import { Alert } from "react-native";
import { useAppStore } from "@/spine/store";
import { CIRCLE_GROUP, CIRCLE_META } from "@/spine/invite";
import { SELF_ID, type CircleId } from "@/spine/types";
import { usingNativeBridge, platformLabel } from "../../health/HealthBridge";
import { FILL_STEPS, FONT_STEPS, useDisplay } from "../display";
import { Body, Btn, Field, Label, Muted, Screen, Seg, Tile } from "../ui";
import { useState } from "react";

export function SettingsTab({
  onOpenConnectors,
  onOpenInbox,
}: {
  onOpenConnectors: () => void;
  onOpenInbox: () => void;
}) {
  const people = useAppStore((s) => s.people);
  const actorId = useAppStore((s) => s.actorId);
  const setActor = useAppStore((s) => s.setActor);
  const act = useAppStore((s) => s.act);
  const me = people.find((p) => p.id === SELF_ID);
  const { fontPct, fillPct, high, setFont, setFill, toggleHigh } = useDisplay();
  const [name, setName] = useState("");
  const [circle, setCircle] = useState<CircleId>("family");
  const circles = Object.values(CIRCLE_GROUP).flatMap((g) => g.circles);

  return (
    <Screen title="Settings" subtitle="Display, circle, and health store.">
      <Tile>
        <Label>You</Label>
        <Body>{me?.name ?? "Rajan"}</Body>
        <Muted>{me?.title}</Muted>
      </Tile>
      <Tile>
        <Label>Text size</Label>
        {FONT_STEPS.map((n) => (
          <Btn key={n} label={`${n}%`} dim={fontPct !== n} onPress={() => setFont(n)} />
        ))}
      </Tile>
      <Tile>
        <Label>Tile glass</Label>
        {FILL_STEPS.map((n) => (
          <Btn key={n} label={`${n}%`} dim={fillPct !== n} onPress={() => setFill(n)} />
        ))}
        <Muted>Wallpaper peeks through. Type stays bright.</Muted>
      </Tile>
      <Btn label={high ? "High contrast on" : "High contrast off"} onPress={toggleHigh} />
      <Tile>
        <Label>Health store</Label>
        <Body>{platformLabel}</Body>
        <Muted>{usingNativeBridge ? "Native bridge" : "JS mock"}</Muted>
      </Tile>
      <Btn label="Connectors" onPress={onOpenConnectors} />
      <Btn label="Inbox" onPress={onOpenInbox} />
      <Tile>
        <Label>Preview as</Label>
        {people.slice(0, 10).map((p) => (
          <Btn key={p.id} label={`${p.shortName}${p.inviteStatus === "pending" ? " · pending" : ""}`} dim={actorId !== p.id} onPress={() => setActor(p.id)} />
        ))}
      </Tile>
      <Tile>
        <Label>Invite</Label>
        <Field value={name} onChange={setName} placeholder="Name" />
        <Seg
          value={circle}
          onChange={setCircle}
          options={circles.map((c) => ({ id: c, label: CIRCLE_META[c].label }))}
        />
        <Btn
          label="Send invite"
          onPress={() => {
            if (!name.trim()) return;
            const r = act("people.invite", { name: name.trim(), circle, title: CIRCLE_META[circle as Exclude<CircleId, "self">]?.title ?? circle, channel: "whatsapp" });
            Alert.alert(r.ok ? "Invite saved" : r.error ?? "Failed");
            if (r.ok) setName("");
          }}
        />
        {people
          .filter((p) => p.id !== SELF_ID)
          .map((p) => (
            <Muted key={p.id}>
              {p.name} · {p.circle} · {p.inviteStatus ?? "in"}
            </Muted>
          ))}
      </Tile>
    </Screen>
  );
}

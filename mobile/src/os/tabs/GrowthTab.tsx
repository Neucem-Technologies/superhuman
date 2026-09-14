import { useState } from "react";
import { Alert } from "react-native";
import { useAppStore } from "@/spine/store";
import { Body, Btn, Field, Label, Muted, Screen, Tile } from "../ui";

export function GrowthTab() {
  const chat = useAppStore((s) => s.chat);
  const growth = useAppStore((s) => s.growth);
  const act = useAppStore((s) => s.act);
  const [text, setText] = useState("");
  return (
    <Screen title="Growth" subtitle="Chat-first. Streaks live on the spine.">
      {growth.map((g) => (
        <Tile key={g.id} onPress={() => act("growth.checkin", { id: g.id })}>
          <Label>{g.area}</Label>
          <Body>{g.title}</Body>
          <Muted>streak {g.streak}</Muted>
        </Tile>
      ))}
      {chat.slice(-8).map((m) => (
        <Tile key={m.id}>
          <Label>{m.role === "user" ? "You" : "Bot"}</Label>
          <Body>{m.text}</Body>
          {m.results?.map((r) => (
            <Muted key={r.title}>
              {r.source} · {r.title} · {r.meta}
            </Muted>
          ))}
        </Tile>
      ))}
      <Field value={text} onChange={setText} placeholder="Ask the library…" />
      <Btn
        label="Send"
        onPress={() => {
          if (!text.trim()) return;
          const r = act("growth.chat", { text: text.trim() });
          if (!r.ok) Alert.alert("Couldn’t", r.error ?? "Failed");
          setText("");
        }}
      />
    </Screen>
  );
}

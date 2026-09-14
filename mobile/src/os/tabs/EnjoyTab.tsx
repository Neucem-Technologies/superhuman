import { useState } from "react";
import { Alert } from "react-native";
import { useAppStore } from "@/spine/store";
import type { TabId } from "@/spine/types";
import { Body, Btn, Field, Label, Muted, Screen, Seg, Tile } from "../ui";

export function EnjoyTab() {
  const [sec, setSec] = useState<"for" | "plans" | "capture">("for");
  const streams = useAppStore((s) => s.streams);
  const captures = useAppStore((s) => s.captures);
  const act = useAppStore((s) => s.act);
  const stress = streams.find((s) => s.source === "ultrahuman")?.stress ?? 50;
  const calm = stress >= 60;
  const [text, setText] = useState("");
  const [target, setTarget] = useState<TabId>("travel");
  const picks = calm
    ? [
        { k: "Music", t: "Music for Inner Stillness", m: "Spotify · library" },
        { k: "Show", t: "The Bear · S2 E3, already started", m: "Quiet kitchen, 30 min" },
        { k: "Activity", t: "Walk Lodhi at dusk, no podcast", m: "Fits pickup window" },
      ]
    : [
        { k: "Music", t: "New wave mix", m: "Spotify · Discover" },
        { k: "Show", t: "Drive to Survive", m: "High tempo" },
        { k: "Activity", t: "Khan Market dinner with Kabir", m: "Friends circle" },
      ];
  return (
    <Screen title="Enjoy" subtitle={calm ? "Mood is loaded. Quiet picks." : "Energy is up."}>
      <Seg
        value={sec}
        onChange={setSec}
        options={[
          { id: "for", label: "For you" },
          { id: "plans", label: "Plans" },
          { id: "capture", label: "Capture" },
        ]}
      />
      {sec === "for" &&
        picks.map((x) => (
          <Tile key={x.t}>
            <Label>{x.k}</Label>
            <Body>{x.t}</Body>
            <Muted>{x.m}</Muted>
          </Tile>
        ))}
      {sec === "plans" && (
        <>
          <Tile>
            <Label>Father–daughter</Label>
            <Body>Saturday · Lodhi + ice cream + Midland</Body>
            <Muted>10:00 Lodhi Garden, camera</Muted>
            <Muted>12:00 Natural Ice Cream, Defence Colony</Muted>
            <Muted>13:00 Midland Bookshop, one book each</Muted>
          </Tile>
          <Tile>
            <Label>Night out</Label>
            <Body>Khan Market · Kabir</Body>
            <Muted>Walk-in at The Big Chill after 8. Calendar still needs your confirm.</Muted>
          </Tile>
        </>
      )}
      {sec === "capture" && (
        <>
          <Field value={text} onChange={setText} placeholder="Paste a link or a thought" multiline />
          <Seg
            value={target}
            onChange={setTarget}
            options={[
              { id: "travel", label: "Travel" },
              { id: "shopping", label: "Shopping" },
              { id: "health", label: "Health" },
              { id: "notes", label: "Notes" },
            ]}
          />
          <Btn
            label="Save"
            onPress={() => {
              if (!text.trim()) return;
              act("ent.capture", { text: text.trim(), targetTab: target });
              Alert.alert(`Filed to ${target}`);
              setText("");
            }}
          />
          {captures.map((c) => (
            <Tile key={c.id}>
              <Label>{c.targetTab}</Label>
              <Muted>{c.text}</Muted>
            </Tile>
          ))}
        </>
      )}
    </Screen>
  );
}

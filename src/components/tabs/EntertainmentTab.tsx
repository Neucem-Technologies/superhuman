import { useState } from "react";
import { Button, Card, Input, SectionTitle, Segmented } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { toast } from "sonner";
import type { TabId } from "@/spine/types";
import { SlideHero } from "@/components/shell/SlideHero";

export function EntertainmentTab() {
  const [sec, setSec] = useState<"for" | "plans" | "capture">("for");
  const streams = useAppStore((s) => s.streams);
  const captures = useAppStore((s) => s.captures);
  const act = useAppStore((s) => s.act);
  const stress = streams.find((s) => s.source === "ultrahuman")?.stress ?? 50;
  const calm = stress >= 60;
  const [text, setText] = useState("");
  const [target, setTarget] = useState<TabId>("travel");

  return (
    <div className="space-y-4">
      <SlideHero slide="entertainment">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Entertainment</h1>
        <p className="mt-0.5 text-sm text-muted">{calm ? "Mood is loaded. Quiet picks from your subscriptions." : "Energy is up. Brighter picks."}</p>
      </SlideHero>
      <Segmented
        value={sec}
        onChange={setSec}
        options={[
          { id: "for", label: "For you" },
          { id: "plans", label: "Plans" },
          { id: "capture", label: "Capture" },
        ]}
      />
      {sec === "for" && (
        <div className="space-y-2">
          {(calm
            ? [
                { k: "Music", t: "Music for Inner Stillness", m: "Spotify · library" },
                { k: "Show", t: "The Bear · S2 E3, already started", m: "Quiet kitchen, 30 min" },
                { k: "Activity", t: "Walk Lodhi at dusk, no podcast", m: "Fits pickup window" },
              ]
            : [
                { k: "Music", t: "New wave mix", m: "Spotify · Discover" },
                { k: "Show", t: "Drive to Survive", m: "High tempo" },
                { k: "Activity", t: "Khan Market dinner with Kabir", m: "Friends circle" },
              ]
          ).map((x) => (
            <Card key={x.t}>
              <p className="text-xs uppercase tracking-wide text-subtle">{x.k}</p>
              <p className="text-sm font-medium">{x.t}</p>
              <p className="text-xs text-muted">{x.m}</p>
            </Card>
          ))}
        </div>
      )}
      {sec === "plans" && (
        <div className="space-y-2">
          <Card>
            <p className="text-xs uppercase tracking-wide text-subtle">Father–daughter</p>
            <p className="text-sm font-medium">Saturday · Lodhi + ice cream + Midland</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <li>10:00 Lodhi Garden, camera</li>
              <li>12:00 Natural Ice Cream, Defence Colony</li>
              <li>13:00 Midland Bookshop, one book each</li>
            </ul>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-subtle">Night out</p>
            <p className="text-sm font-medium">Khan Market · Kabir</p>
            <p className="text-sm text-muted">Walk-in at The Big Chill after 8. Friends can add to Work as a hold — calendar still needs your confirm.</p>
          </Card>
        </div>
      )}
      {sec === "capture" && (
        <div className="space-y-3">
          <SectionTitle>Universal capture</SectionTitle>
          <p className="text-sm text-muted">Paste a link, drop a note, or say where it belongs. Files into that tab.</p>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a link or a thought" />
          <Segmented
            value={target}
            onChange={setTarget}
            options={[
              { id: "travel", label: "Travel" },
              { id: "shopping", label: "Shopping" },
              { id: "health", label: "Health" },
              { id: "notes", label: "Notes" },
            ]}
          />
          <Button
            onClick={() => {
              if (!text.trim()) return;
              act("ent.capture", { text: text.trim(), targetTab: target });
              toast(`Filed to ${target}`);
              setText("");
            }}
          >
            Save
          </Button>
          <ul className="space-y-2">
            {captures.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="text-xs uppercase tracking-wide text-subtle">{c.targetTab}</span>
                <p className="text-muted">{c.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

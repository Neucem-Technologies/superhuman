import { useState } from "react";
import { Button, Card, Input, SectionTitle } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { toast } from "sonner";
import { SlideHero } from "@/components/shell/SlideHero";

export function GrowthTab() {
  const chat = useAppStore((s) => s.chat);
  const growth = useAppStore((s) => s.growth);
  const act = useAppStore((s) => s.act);
  const setTab = useAppStore((s) => s.setTab);
  const [text, setText] = useState("");

  return (
    <div className="flex min-h-[70dvh] flex-col gap-4">
      <SlideHero slide="growth">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Growth</h1>
        <p className="mt-0.5 text-sm text-foreground/85">Chat-first. Searches mock YouTube / Spotify subscriptions and logs the spine.</p>
      </SlideHero>
      <div className="flex-1 space-y-3">
        {chat.map((m) => (
          <div key={m.id} className={m.role === "user" ? "ml-8" : "mr-8"}>
            <Card className={m.role === "user" ? "bg-elevated" : ""}>
              <p className="text-xs uppercase tracking-[0.14em] text-subtle">{m.role === "user" ? "You" : "Bot"}</p>
              <p className="mt-1 text-sm">{m.text}</p>
              {m.results?.map((r) => (
                <p key={r.title} className="mt-1 text-xs text-muted">
                  {r.source} · {r.title} · {r.meta}
                </p>
              ))}
            </Card>
          </div>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          const r = act("growth.chat", { text: text.trim() });
          if (!r.ok) toast.error(r.error);
          setText("");
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask the library" />
        <Button type="submit">Send</Button>
      </form>
      <section>
        <SectionTitle>Interest streaks</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {growth.map((g) => (
            <Card key={g.id}>
              <p className="text-xs uppercase tracking-[0.14em] text-subtle">{g.area}</p>
              <p className="text-sm font-medium">{g.title}</p>
              <p className="font-mono text-lg tabular-nums">{g.streak}d</p>
              <Button size="sm" variant="ghost" className="mt-1" onClick={() => act("growth.checkin", { id: g.id })}>
                Log today
              </Button>
            </Card>
          ))}
        </div>
      </section>
      <Button variant="secondary" onClick={() => setTab("home")}>
        Stress loop lives on Home
      </Button>
    </div>
  );
}

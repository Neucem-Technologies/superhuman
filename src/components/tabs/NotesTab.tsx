import { useState } from "react";
import { Badge, Button, Card, Input, Textarea } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { formatDay } from "@/spine/format";
import { toast } from "sonner";
import { SlideHero } from "@/components/shell/SlideHero";

export function NotesTab() {
  const notes = useAppStore((s) => s.notes);
  const actorId = useAppStore((s) => s.actorId);
  const act = useAppStore((s) => s.act);
  const people = useAppStore((s) => s.people);
  const visible = notes.filter((n) => n.authorId === actorId || n.shared || n.authorId === "rajan");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-4">
      <SlideHero slide="notes">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Notes</h1>
        <p className="mt-0.5 text-sm text-foreground/85">Quick capture. Voice goes through the bar below — it transcribes, then files here.</p>
      </SlideHero>
      <Card className="space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write, or pretend this is a voice memo" />
        <Button
          size="sm"
          onClick={() => {
            if (!title.trim() && !body.trim()) return;
            const r = act("notes.save", { title: title || "Untitled", body });
            if (!r.ok) toast.error(r.error);
            else {
              setTitle("");
              setBody("");
            }
          }}
        >
          Save
        </Button>
      </Card>
      {visible.map((n) => {
        const author = people.find((p) => p.id === n.authorId);
        return (
          <Card key={n.id}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{n.title}</p>
              <div className="flex gap-1">
                {n.voicePlaceholder ? <Badge>voice</Badge> : null}
                {n.shared ? <Badge tone="accent">shared</Badge> : null}
              </div>
            </div>
            <p className="mt-1 text-sm text-muted">{n.body}</p>
            <p className="mt-2 text-xs text-subtle">
              {author?.shortName} · {formatDay(n.updatedAt)}
              {n.linkedEventIds.length ? ` · linked ${n.linkedEventIds.length}` : ""}
            </p>
            <button type="button" className="mt-1 text-xs text-muted" onClick={() => act("notes.share", { id: n.id })}>
              {n.shared ? "Unshare" : "Share with family"}
            </button>
          </Card>
        );
      })}
    </div>
  );
}

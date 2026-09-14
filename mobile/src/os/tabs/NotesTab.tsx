import { useState } from "react";
import { Alert } from "react-native";
import { useAppStore } from "@/spine/store";
import { formatDay } from "@/spine/format";
import { Body, Btn, Field, Label, Muted, Screen, Tile } from "../ui";

export function NotesTab() {
  const notes = useAppStore((s) => s.notes);
  const actorId = useAppStore((s) => s.actorId);
  const act = useAppStore((s) => s.act);
  const visible = notes.filter((n) => n.authorId === actorId || n.shared || n.authorId === "rajan");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <Screen title="Notes" subtitle="Quick capture. The bar below also files here.">
      <Field value={title} onChange={setTitle} placeholder="Title" />
      <Field value={body} onChange={setBody} placeholder="Write" multiline />
      <Btn
        label="Save"
        onPress={() => {
          if (!title.trim() && !body.trim()) return;
          const r = act("notes.save", { title: title || "Untitled", body });
          if (!r.ok) Alert.alert("Couldn’t", r.error ?? "Failed");
          else {
            setTitle("");
            setBody("");
          }
        }}
      />
      {visible.map((n) => (
        <Tile key={n.id}>
          <Label>{formatDay(n.updatedAt)}</Label>
          <Body>{n.title}</Body>
          <Muted>{n.body}</Muted>
        </Tile>
      ))}
    </Screen>
  );
}

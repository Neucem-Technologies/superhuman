import { useState } from "react";
import { Alert } from "react-native";
import { useAppStore } from "@/spine/store";
import { childFolders, filesIn, folderPath, formatBytes } from "@/spine/vault";
import { Body, Btn, Field, Label, Muted, Screen, Tile } from "../ui";

export function FilesTab() {
  const folders = useAppStore((s) => s.folders ?? []);
  const files = useAppStore((s) => s.files ?? []);
  const act = useAppStore((s) => s.act);
  const [current, setCurrent] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const path = folderPath(folders, current);
  const kids = childFolders(folders, current);
  const listed = filesIn(files, current);
  return (
    <Screen title="Files" subtitle="Vault. Files stay on this device.">
      {path.length > 0 ? (
        <Btn label="Up" dim onPress={() => setCurrent(path[path.length - 2]?.id ?? null)} />
      ) : null}
      <Muted>{path.map((p) => p.name).join(" / ") || "Root"}</Muted>
      {kids.map((f) => (
        <Tile key={f.id} onPress={() => setCurrent(f.id)}>
          <Label>Folder</Label>
          <Body>{f.name}</Body>
        </Tile>
      ))}
      {listed.map((file) => (
        <Tile key={file.id}>
          <Body>{file.name}</Body>
          <Muted>
            {formatBytes(file.size)} · {file.mime}
          </Muted>
          {file.textExcerpt ? <Muted>{file.textExcerpt}</Muted> : null}
        </Tile>
      ))}
      <Field value={newName} onChange={setNewName} placeholder="New folder name" />
      <Btn
        label="Create folder"
        onPress={() => {
          if (!newName.trim()) return;
          const r = act("vault.folder.create", { name: newName.trim(), parentId: current ?? "" });
          Alert.alert(r.ok ? "Created" : r.error ?? "Failed");
          if (r.ok) setNewName("");
        }}
      />
    </Screen>
  );
}

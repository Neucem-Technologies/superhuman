import { useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  File as FileIcon,
  FileAudio,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Input, Modal, SectionTitle } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { formatDay } from "@/spine/format";
import { TAB_LABELS, type VaultFolder } from "@/spine/types";
import { childFolders, fileKind, filesIn, folderHasContent, folderPath, formatBytes, readLocalFile } from "@/spine/vault";
import { useAppStore } from "@/spine/store";
import { SlideHero } from "@/components/shell/SlideHero";

export function FilesTab() {
  const folders = useAppStore((s) => s.folders ?? []);
  const files = useAppStore((s) => s.files ?? []);
  const act = useAppStore((s) => s.act);
  const [current, setCurrent] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveId, setMoveId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const path = folderPath(folders, current);
  const kids = childFolders(folders, current);
  const listed = filesIn(files, current);
  const preview = files.find((f) => f.id === previewId);
  const moving = files.find((f) => f.id === moveId);

  const folderOptions = useMemo(
    () => [{ id: "", name: "Vault (root)" }, ...folders.map((f) => ({ id: f.id, name: pathLabel(folders, f.id) }))],
    [folders],
  );

  return (
    <div className="space-y-4">
      <SlideHero
        slide="files"
        aside={
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setNewOpen(true)}>
              <FolderPlus className="size-3.5" />
              Folder
            </Button>
            <Button size="sm" onClick={() => uploadRef.current?.click()}>
              <Upload className="size-3.5" />
              Upload
            </Button>
          </div>
        }
      >
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Files</h1>
        <p className="mt-0.5 text-sm text-foreground/85">Folders for the things you want to keep. Chat attachments land here too.</p>
      </SlideHero>
      <input
        ref={uploadRef}
        type="file"
        multiple
        className="sr-only"
        onChange={async (e) => {
          if (!e.target.files?.length) return;
          const pending = await Promise.all(Array.from(e.target.files).slice(0, 8).map(readLocalFile));
          const r = act("vault.file.add", { files: pending, folderId: current ?? "" });
          if (!r.ok) toast.error(r.error);
          else toast(`Saved ${pending.length} file${pending.length === 1 ? "" : "s"}`);
          e.target.value = "";
        }}
      />

      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted">
        <button type="button" className="hover:text-foreground" onClick={() => setCurrent(null)}>
          Vault
        </button>
        {path.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <ChevronRight className="size-3" />
            <button type="button" className="hover:text-foreground" onClick={() => setCurrent(f.id)}>
              {f.name}
            </button>
          </span>
        ))}
      </nav>

      {kids.length > 0 && (
        <section>
          <SectionTitle>Folders</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {kids.map((f) => (
              <Card key={f.id} className="p-2">
                <button type="button" onClick={() => setCurrent(f.id)} className="flex w-full items-start gap-2 text-left">
                  <Folder className="mt-0.5 size-4 shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="text-xs text-subtle">
                      {childFolders(folders, f.id).length} folders · {filesIn(files, f.id).length} files
                    </span>
                  </span>
                </button>
                <div className="mt-2 flex gap-1">
                  <button
                    type="button"
                    className="relative flex size-8 items-center justify-center rounded-sm text-subtle hover:text-foreground"
                    aria-label={`Rename ${f.name}`}
                    onClick={() => {
                      setRenameId(f.id);
                      setRenameValue(f.name);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="relative flex size-8 items-center justify-center rounded-sm text-subtle hover:text-bad"
                    aria-label={`Delete ${f.name}`}
                    onClick={() => {
                      if (folderHasContent(folders, files, f.id)) {
                        toast.error("Empty it first.");
                        return;
                      }
                      const r = act("vault.folder.delete", { id: f.id });
                      if (!r.ok) toast.error(r.error);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Files</SectionTitle>
        {listed.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nothing in this folder. Upload here, or drop a file on the bar below.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {listed.map((f) => {
              const Kind = iconFor(fileKind(f.mime, f.name));
              return (
                <Card key={f.id} className="flex items-start gap-3">
                  <Kind className="mt-0.5 size-4 shrink-0 text-muted" />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setPreviewId(f.id)}>
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-subtle">
                      {formatBytes(f.size)} · {formatDay(f.createdAt)}
                      {f.sourceTab ? ` · ${TAB_LABELS[f.sourceTab]}` : ""}
                    </p>
                    {f.textExcerpt ? <p className="mt-1 line-clamp-2 text-xs text-muted">{f.textExcerpt}</p> : null}
                  </button>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-sm text-subtle hover:text-foreground"
                      aria-label={`Move ${f.name}`}
                      onClick={() => setMoveId(f.id)}
                    >
                      <Folder className="size-3.5" />
                    </button>
                    {f.dataUrl ? (
                      <a
                        href={f.dataUrl}
                        download={f.name}
                        className="flex size-8 items-center justify-center rounded-sm text-subtle hover:text-foreground"
                        aria-label={`Download ${f.name}`}
                      >
                        <Download className="size-3.5" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-sm text-subtle hover:text-bad"
                      aria-label={`Delete ${f.name}`}
                      onClick={() => {
                        const r = act("vault.file.delete", { id: f.id });
                        if (!r.ok) toast.error(r.error);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
      <p className="text-xs text-subtle">Files under 400 KB stay on this device. Larger ones keep name and type only.</p>

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New folder"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const name = newName.trim();
                if (!name) return;
                const r = act("vault.folder.create", { name, parentId: current ?? "" });
                if (!r.ok) toast.error(r.error);
                else {
                  setNewName("");
                  setNewOpen(false);
                }
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Folder name"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              const r = act("vault.folder.create", { name, parentId: current ?? "" });
              if (r.ok) {
                setNewName("");
                setNewOpen(false);
              }
            }
          }}
        />
      </Modal>

      <Modal
        open={Boolean(renameId)}
        onClose={() => setRenameId(null)}
        title="Rename folder"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!renameId || !renameValue.trim()) return;
                const r = act("vault.folder.rename", { id: renameId, name: renameValue.trim() });
                if (!r.ok) toast.error(r.error);
                else setRenameId(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
      </Modal>

      <Modal
        open={Boolean(moveId)}
        onClose={() => setMoveId(null)}
        title={moving ? `Move ${moving.name}` : "Move"}
        footer={
          <Button variant="ghost" size="sm" onClick={() => setMoveId(null)}>
            Close
          </Button>
        }
      >
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {folderOptions.map((opt) => (
            <button
              key={opt.id || "root"}
              type="button"
              className={cn(
                "flex h-10 w-full items-center rounded-sm px-2 text-left text-sm",
                (moving?.folderId ?? "") === opt.id ? "bg-elevated" : "hover:bg-elevated",
              )}
              onClick={() => {
                if (!moveId) return;
                const r = act("vault.file.move", { id: moveId, folderId: opt.id });
                if (!r.ok) toast.error(r.error);
                else {
                  toast("Moved");
                  setMoveId(null);
                }
              }}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={Boolean(preview)} onClose={() => setPreviewId(null)} title={preview?.name ?? "File"}>
        {preview && fileKind(preview.mime, preview.name) === "image" && preview.dataUrl ? (
          <img
            src={preview.dataUrl}
            alt={preview.name}
            className="max-h-80 w-full rounded-md object-contain outline outline-1 -outline-offset-1 outline-foreground/10"
          />
        ) : null}
        {preview?.textExcerpt ? <p className="whitespace-pre-wrap text-sm text-muted">{preview.textExcerpt}</p> : null}
        {!preview?.dataUrl && !preview?.textExcerpt ? (
          <p className="text-sm text-muted">Name and type only — the original was too large to keep on this device.</p>
        ) : null}
        {preview?.dataUrl ? (
          <a href={preview.dataUrl} download={preview.name} className="inline-flex text-sm text-muted">
            Download
          </a>
        ) : null}
      </Modal>
    </div>
  );
}

function iconFor(kind: ReturnType<typeof fileKind>) {
  if (kind === "image") return ImageIcon;
  if (kind === "audio") return FileAudio;
  if (kind === "pdf" || kind === "text") return FileText;
  return FileIcon;
}

function pathLabel(folders: VaultFolder[], id: string) {
  return folderPath(folders, id)
    .map((f) => f.name)
    .join(" / ");
}

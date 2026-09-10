import { uid } from "@/lib/utils";
import type { PendingFile, TabId, VaultFile, VaultFolder } from "./types";
import { TAB_FOLDER } from "./classify";

export const MAX_FILE_BYTES = 400 * 1024;
export const DATA_URL_BUDGET = 1_500_000;

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKind(mime: string, name: string): "image" | "audio" | "pdf" | "text" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (mime.startsWith("text/") || /\.(md|json|csv|txt|markdown)$/i.test(name)) return "text";
  return "other";
}

export function asPendingFiles(v: unknown): PendingFile[] {
  if (!Array.isArray(v)) return [];
  const out: PendingFile[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.name !== "string") continue;
    out.push({
      name: rec.name,
      mime: typeof rec.mime === "string" ? rec.mime : "application/octet-stream",
      size: typeof rec.size === "number" ? rec.size : 0,
      dataUrl: typeof rec.dataUrl === "string" ? rec.dataUrl : undefined,
      textExcerpt: typeof rec.textExcerpt === "string" ? rec.textExcerpt : undefined,
    });
  }
  return out;
}

export function readLocalFile(file: File): Promise<PendingFile> {
  return new Promise((resolve, reject) => {
    const mime = file.type || "application/octet-stream";
    const base: PendingFile = { name: file.name, mime, size: file.size };
    const kind = fileKind(mime, file.name);
    const tooBig = file.size > MAX_FILE_BYTES;

    if (kind === "text" && file.size < 80_000) {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ ...base, textExcerpt: String(reader.result ?? "").slice(0, 4000) });
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsText(file);
      return;
    }
    if (!tooBig) {
      const reader = new FileReader();
      reader.onload = () => resolve({ ...base, dataUrl: String(reader.result ?? "") });
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(file);
      return;
    }
    resolve({
      ...base,
      textExcerpt: `${file.name} · ${formatBytes(file.size)} — kept as a name only (over 400 KB).`,
    });
  });
}

export function dataUrlBudgetUsed(files: VaultFile[]) {
  return files.reduce((n, f) => n + (f.dataUrl?.length ?? 0), 0);
}

export function resolveFolderId(
  folders: VaultFolder[],
  tab: TabId,
  folderName?: string,
): { folders: VaultFolder[]; folderId: string | null } {
  const wanted = (folderName || TAB_FOLDER[tab]).trim() || TAB_FOLDER[tab];
  const existing = folders.find((f) => f.name.toLowerCase() === wanted.toLowerCase());
  if (existing) return { folders, folderId: existing.id };
  const tabFolder = folders.find((f) => f.name.toLowerCase() === TAB_FOLDER[tab].toLowerCase());
  if (tabFolder && wanted.toLowerCase() === TAB_FOLDER[tab].toLowerCase()) {
    return { folders, folderId: tabFolder.id };
  }
  const created: VaultFolder = {
    id: uid("fld"),
    name: wanted,
    parentId: null,
    createdAt: Date.now(),
  };
  return { folders: [...folders, created], folderId: created.id };
}

export function folderPath(folders: VaultFolder[], id: string | null): VaultFolder[] {
  const path: VaultFolder[] = [];
  let cur = id;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    const f = folders.find((x) => x.id === cur);
    if (!f) break;
    path.unshift(f);
    cur = f.parentId;
  }
  return path;
}

export function childFolders(folders: VaultFolder[], parentId: string | null) {
  return folders.filter((f) => f.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name));
}

export function filesIn(files: VaultFile[], folderId: string | null) {
  return files
    .filter((f) => f.folderId === folderId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function folderHasContent(folders: VaultFolder[], files: VaultFile[], id: string) {
  return folders.some((f) => f.parentId === id) || files.some((f) => f.folderId === id);
}

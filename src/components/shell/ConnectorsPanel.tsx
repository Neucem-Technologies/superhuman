import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Modal } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { CONNECTOR_CATALOG, catalogOf } from "@/spine/connectors";
import { SELF_ID, type ConnectorId } from "@/spine/types";

export function ConnectorsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectors = useAppStore((s) => s.connectors ?? []);
  const act = useAppStore((s) => s.act);
  const actorId = useAppStore((s) => s.actorId);
  const [busy, setBusy] = useState<ConnectorId | null>(null);
  const mine = actorId === SELF_ID;

  async function run(id: ConnectorId, type: "connector.connect" | "connector.sync" | "connector.disconnect") {
    if (!mine) {
      toast.error("Only you can manage connectors.");
      return;
    }
    setBusy(id);
    if (type !== "connector.disconnect") await new Promise((r) => setTimeout(r, 420));
    const r = act(type, { id });
    setBusy(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    const name = catalogOf(id).label;
    toast(type === "connector.disconnect" ? `${name} disconnected` : type === "connector.sync" ? `${name} synced` : `${name} connected · mock API`);
  }

  return (
    <Modal open={open} onClose={onClose} title="Connectors">
      <p className="text-xs text-muted">
        Mock APIs only — no real passwords. Each feed writes into the tab it belongs to.
      </p>
      <div className="max-h-[65dvh] space-y-2 overflow-y-auto">
        {CONNECTOR_CATALOG.map((c) => {
          const row = connectors.find((x) => x.id === c.id);
          const on = row?.status === "connected";
          const pending = busy === c.id;
          return (
            <div key={c.id} className="rounded-md bg-elevated p-3 shadow-border">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted">{c.blurb}</p>
                  <p className="mt-1 text-xs text-subtle">
                    {on ? row?.account : "Not linked"} · {c.tabs}
                    {on && row?.lastSync ? ` · ${ago(row.lastSync)}` : ""}
                  </p>
                </div>
                <Badge tone={on ? "ok" : "neutral"}>{pending ? "…" : on ? "Live" : "Off"}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.scopes.map((s) => (
                  <span key={s} className="rounded-sm bg-surface px-1.5 py-0.5 text-xs text-subtle">
                    {s}
                  </span>
                ))}
              </div>
              {mine && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {on ? (
                    <>
                      <Button size="sm" onClick={() => void run(c.id, "connector.sync")} disabled={pending}>
                        Sync
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void run(c.id, "connector.disconnect")} disabled={pending}>
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => void run(c.id, "connector.connect")} disabled={pending}>
                      Connect
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function ago(ts: number) {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / (24 * 60))}d ago`;
}

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Modal } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/spine/store";
import { CONNECTOR_CATALOG, CONNECTOR_GROUPS, catalogOf, type ConnectorGroupId } from "@/spine/connectors";
import { SELF_ID, type ConnectorId } from "@/spine/types";

type Filter = "all" | ConnectorGroupId | "live" | "off";

export function ConnectorsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectors = useAppStore((s) => s.connectors ?? []);
  const act = useAppStore((s) => s.act);
  const actorId = useAppStore((s) => s.actorId);
  const [busy, setBusy] = useState<ConnectorId | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const mine = actorId === SELF_ID;

  const liveCount = connectors.filter((c) => c.status === "connected").length;

  const rows = useMemo(() => {
    return CONNECTOR_CATALOG.filter((c) => {
      const row = connectors.find((x) => x.id === c.id);
      const on = row?.status === "connected";
      if (filter === "live") return on;
      if (filter === "off") return !on;
      if (filter === "all") return true;
      return c.group === filter;
    });
  }, [connectors, filter]);

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
    const name = catalogOf(id)?.label ?? id;
    toast(type === "connector.disconnect" ? `${name} disconnected` : type === "connector.sync" ? `${name} synced` : `${name} connected`);
  }

  return (
    <Modal open={open} onClose={onClose} title="Connectors">
      <p className="text-xs text-muted">
        {liveCount} of {CONNECTOR_CATALOG.length} linked. Each feed stays in its own tab.
      </p>
      <div className="flex flex-wrap gap-1">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "live" as const, label: "Linked" },
            { id: "off" as const, label: "Off" },
            ...CONNECTOR_GROUPS,
          ] as { id: Filter; label: string }[]
        ).map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setFilter(g.id)}
            className={cn(
              "h-8 rounded-sm px-2.5 text-xs",
              filter === g.id ? "bg-foreground text-background" : "bg-elevated text-muted shadow-border",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((c) => {
          const row = connectors.find((x) => x.id === c.id);
          const on = row?.status === "connected";
          const pending = busy === c.id;
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-md bg-elevated p-3 shadow-border">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{c.label}</p>
                  <Badge tone={on ? "ok" : "neutral"}>{pending ? "…" : on ? "On" : "Off"}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {on ? (row?.account ?? c.account) : c.blurb}
                  {on && row?.lastSync ? ` · ${ago(row.lastSync)}` : ""}
                </p>
              </div>
              {mine ? (
                on ? (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" onClick={() => void run(c.id, "connector.sync")} disabled={pending}>
                      Sync
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void run(c.id, "connector.disconnect")} disabled={pending}>
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => void run(c.id, "connector.connect")} disabled={pending}>
                    Connect
                  </Button>
                )
              ) : null}
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

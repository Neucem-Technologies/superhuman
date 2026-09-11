import { useState } from "react";
import { Badge, Button, Card, Input, Modal, SectionTitle, Segmented } from "@/components/ui/primitives";
import { useAppStore, personById } from "@/spine/store";
import { inr } from "@/spine/format";
import { cashflowFor } from "@/spine/rules";
import { toast } from "sonner";
import { SlideHero } from "@/components/shell/SlideHero";

export function ShoppingTab() {
  const [sec, setSec] = useState<"lists" | "vault" | "inventory">("lists");
  const lists = useAppStore((s) => s.lists);
  const research = useAppStore((s) => s.research);
  const inventory = useAppStore((s) => s.inventory);
  const act = useAppStore((s) => s.act);
  const actorId = useAppStore((s) => s.actorId);
  const [adding, setAdding] = useState("");
  const [buyId, setBuyId] = useState<string | null>(null);
  const [protocol, setProtocol] = useState(false);
  const state = useAppStore.getState();
  const item = research.find((r) => r.id === buyId);
  const cf = item ? cashflowFor(state, item.priceInr) : null;

  return (
    <div className="space-y-4">
      <SlideHero slide="shopping">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Shopping</h1>
        <p className="mt-0.5 text-sm text-muted">Shared lists with ownership. Vault for research. Inventory after a buy.</p>
      </SlideHero>
      <Segmented
        value={sec}
        onChange={setSec}
        options={[
          { id: "lists", label: "Lists" },
          { id: "vault", label: "Vault" },
          { id: "inventory", label: "Inventory" },
        ]}
      />
      {sec === "lists" &&
        lists.map((l) => (
          <section key={l.id}>
            <SectionTitle right={l.shared ? <span className="text-xs text-subtle">shared</span> : null}>{l.name}</SectionTitle>
            <Card className="space-y-1">
              {l.items.map((i) => {
                const owner = i.ownerId ? personById(state, i.ownerId) : null;
                return (
                  <div key={i.id} className="flex items-center gap-2 py-1">
                    <button
                      type="button"
                      onClick={() => act("shop.item.toggle", { listId: l.id, itemId: i.id })}
                      className={`size-5 rounded-xs shadow-border ${i.checked ? "bg-accent" : ""}`}
                      aria-label="toggle"
                    />
                    <span className={i.checked ? "flex-1 text-sm text-muted line-through" : "flex-1 text-sm"}>{i.name}</span>
                    <span className="text-xs text-subtle">{i.qty}</span>
                    {owner ? <Badge>{owner.shortName}</Badge> : null}
                    {i.fromProtocol ? <Badge tone="ok">protocol</Badge> : null}
                    {i.fromTravel ? <Badge tone="accent">travel</Badge> : null}
                    <button
                      type="button"
                      className="text-xs text-subtle"
                      onClick={() => act("shop.item.remove", { listId: l.id, itemId: i.id })}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {l.id === "list-groc" && (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!adding.trim()) return;
                    const r = act("shop.item.add", { listId: l.id, name: adding.trim() });
                    if (!r.ok) toast.error(r.error);
                    setAdding("");
                  }}
                >
                  <Input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder={`Add as ${actorId}`} />
                  <Button type="submit" size="sm">
                    Add
                  </Button>
                </form>
              )}
            </Card>
          </section>
        ))}
      {sec === "vault" && (
        <div className="space-y-2">
          {research.map((r) => (
            <Card key={r.id}>
              <p className="text-xs uppercase tracking-wide text-subtle">{r.category}</p>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-sm text-muted">{r.notes}</p>
              <p className="mt-1 font-mono text-sm tabular-nums">
                {inr(r.priceInr)} {r.priceInr < r.lastPriceInr ? <span className="text-ok">↓</span> : null}
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => { setBuyId(r.id); setProtocol(!!r.relevantToHealth); }}>
                  Buy
                </Button>
                <Button size="sm" variant="ghost">
                  Watch price
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {sec === "inventory" && (
        <div className="space-y-2">
          {inventory.map((i) => (
            <Card key={i.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{i.name}</p>
                <p className="text-xs text-muted">qty {i.qty}</p>
              </div>
              {i.healthProtocol ? <Badge tone="ok">protocol</Badge> : null}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!buyId}
        onClose={() => setBuyId(null)}
        title="Buy"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBuyId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!buyId) return;
                const r = act("shop.buy", { researchId: buyId, addToProtocol: protocol });
                if (!r.ok) toast.error(r.error);
                else toast(protocol ? "Moved to inventory + protocol" : "Moved to inventory");
                setBuyId(null);
              }}
            >
              Confirm buy
            </Button>
          </>
        }
      >
        {item && cf && (
          <>
            <p className="text-sm">
              {item.name} · {inr(item.priceInr)}
            </p>
            <p className="text-sm text-muted">{cf.message}</p>
            {item.relevantToHealth || protocol ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={protocol} onChange={(e) => setProtocol(e.target.checked)} />
                Add to health protocol
              </label>
            ) : null}
          </>
        )}
      </Modal>
    </div>
  );
}

import { useState } from "react";
import { Alert } from "react-native";
import { useAppStore, personById } from "@/spine/store";
import { inr } from "@/spine/format";
import { cashflowFor } from "@/spine/rules";
import { Body, Btn, Field, Label, Muted, Screen, Seg, Tile } from "../ui";

export function ShopTab() {
  const [sec, setSec] = useState<"lists" | "vault" | "inventory">("lists");
  const lists = useAppStore((s) => s.lists);
  const research = useAppStore((s) => s.research);
  const inventory = useAppStore((s) => s.inventory);
  const act = useAppStore((s) => s.act);
  const actorId = useAppStore((s) => s.actorId);
  const [adding, setAdding] = useState("");
  const [buyId, setBuyId] = useState<string | null>(null);
  const item = research.find((r) => r.id === buyId);
  const cf = item ? cashflowFor(useAppStore.getState(), item.priceInr) : null;
  return (
    <Screen title="Shop" subtitle="Shared lists, vault, inventory.">
      <Seg
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
          <Tile key={l.id}>
            <Label>{l.shared ? "Shared" : "Mine"}</Label>
            <Body>{l.name}</Body>
            {l.items.map((it) => {
              const owner = it.ownerId ? personById(useAppStore.getState(), it.ownerId) : null;
              return (
                <Tile key={it.id} onPress={() => act("shop.item.toggle", { listId: l.id, itemId: it.id })}>
                  <Body>
                    {it.checked ? "☑ " : "☐ "}
                    {it.name} · {it.qty}
                    {owner ? ` · ${owner.shortName}` : ""}
                    {it.fromProtocol ? " · protocol" : ""}
                    {it.fromTravel ? " · travel" : ""}
                  </Body>
                  <Btn label="Remove" dim onPress={() => act("shop.item.remove", { listId: l.id, itemId: it.id })} />
                </Tile>
              );
            })}
            {l.id === "list-groc" ? (
              <>
                <Field value={adding} onChange={setAdding} placeholder={`Add as ${actorId}`} />
                <Btn
                  label="Add"
                  onPress={() => {
                    if (!adding.trim()) return;
                    act("shop.item.add", { listId: l.id, name: adding.trim() });
                    setAdding("");
                  }}
                />
              </>
            ) : null}
          </Tile>
        ))}
      {sec === "vault" &&
        research.map((r) => (
          <Tile key={r.id}>
            <Label>{r.category}</Label>
            <Body>{r.name}</Body>
            <Muted>{r.notes}</Muted>
            <Muted>{inr(r.priceInr)}</Muted>
            <Btn label="Buy" onPress={() => setBuyId(r.id)} />
          </Tile>
        ))}
      {sec === "vault" && buyId && item && cf ? (
        <Tile>
          <Label>Confirm</Label>
          <Body>
            {item.name} · {inr(item.priceInr)}
          </Body>
          <Muted>{cf.message}</Muted>
          <Btn
            label="Confirm buy"
            onPress={() => {
              const res = act("shop.buy", { researchId: buyId, addToProtocol: !!item.relevantToHealth });
              Alert.alert(res.ok ? "Moved to inventory" : res.error ?? "Failed");
              setBuyId(null);
            }}
          />
          <Btn label="Cancel" dim onPress={() => setBuyId(null)} />
        </Tile>
      ) : null}
      {sec === "inventory" &&
        inventory.map((i) => (
          <Tile key={i.id}>
            <Body>{i.name}</Body>
            <Muted>
              qty {i.qty}
              {i.healthProtocol ? " · protocol" : ""}
            </Muted>
          </Tile>
        ))}
    </Screen>
  );
}

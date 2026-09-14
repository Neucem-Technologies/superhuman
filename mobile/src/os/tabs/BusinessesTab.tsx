import { useAppStore } from "@/spine/store";
import { inr } from "@/spine/format";
import { Body, Label, Muted, Screen, Tile } from "../ui";

export function BusinessesTab() {
  const businesses = useAppStore((s) => s.businesses);
  const accounts = useAppStore((s) => s.accounts);
  const loans = useAppStore((s) => s.loans);
  return (
    <Screen title="Businesses" subtitle="Company pots stay out of personal checking.">
      {businesses.map((b) => {
        const acc = accounts.find((a) => a.businessId === b.id);
        const loan = loans.find((l) => l.to === b.id || l.from === b.id);
        return (
          <Tile key={b.id}>
            <Body>{b.name}</Body>
            <Muted>Revenue {inr(b.revenueInr)}</Muted>
            <Muted>Expenses {inr(b.expensesInr)}</Muted>
            <Muted>Ops {acc ? inr(acc.balanceInr) : "—"}</Muted>
            <Label>Clients</Label>
            {b.clients.map((c) => (
              <Muted key={c.id}>
                {c.name} · {c.status}
              </Muted>
            ))}
            <Label>Campaigns</Label>
            {b.campaigns.map((c) => (
              <Muted key={c.id}>
                {c.name} · spend {inr(c.spend)} · CPL {inr(c.cpl)} vs {inr(c.baselineCpl)}
                {c.cpl > c.baselineCpl * 1.15 ? " · under baseline" : " · on track"}
              </Muted>
            ))}
            {loan && loan.amountInr > 0 ? <Muted>Inter-entity loan {inr(loan.amountInr)}</Muted> : null}
          </Tile>
        );
      })}
    </Screen>
  );
}

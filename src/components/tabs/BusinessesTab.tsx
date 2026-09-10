import { Badge, Card, SectionTitle } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { inr } from "@/spine/format";
import { SlideHero } from "@/components/shell/SlideHero";

export function BusinessesTab() {
  const businesses = useAppStore((s) => s.businesses);
  const accounts = useAppStore((s) => s.accounts);
  const loans = useAppStore((s) => s.loans);

  return (
    <div className="space-y-4">
      <SlideHero slide="businesses">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Businesses</h1>
        <p className="mt-0.5 text-sm text-foreground/85">Company pots stay out of personal checking.</p>
      </SlideHero>
      {businesses.map((b) => {
        const acc = accounts.find((a) => a.businessId === b.id);
        const loan = loans.find((l) => l.to === b.id || l.from === b.id);
        return (
          <div key={b.id} className="space-y-2">
            <Card>
              <p className="text-sm font-medium">{b.name}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-subtle">Revenue</p>
                  <p className="font-mono text-sm tabular-nums">{inr(b.revenueInr)}</p>
                </div>
                <div>
                  <p className="text-xs text-subtle">Expenses</p>
                  <p className="font-mono text-sm tabular-nums">{inr(b.expensesInr)}</p>
                </div>
                <div>
                  <p className="text-xs text-subtle">Ops</p>
                  <p className="font-mono text-sm tabular-nums">{acc ? inr(acc.balanceInr) : "—"}</p>
                </div>
              </div>
            </Card>
            <SectionTitle>Clients</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {b.clients.map((c) => (
                <Badge key={c.id} tone={c.status === "paused" ? "warn" : "neutral"}>
                  {c.name} · {c.status}
                </Badge>
              ))}
            </div>
            <SectionTitle>Campaigns</SectionTitle>
            {b.campaigns.map((c) => {
              const bad = c.cpl > c.baselineCpl * 1.15;
              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{c.name}</p>
                    {bad ? <Badge tone="bad">under baseline</Badge> : <Badge tone="ok">on track</Badge>}
                  </div>
                  <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                    spend {inr(c.spend)} · {c.impressions.toLocaleString("en-IN")} imp · {c.conversions} conv · CPL {inr(c.cpl)} vs {inr(c.baselineCpl)}
                  </p>
                </Card>
              );
            })}
            {loan && loan.amountInr > 0 && (
              <Card>
                <p className="text-xs uppercase tracking-[0.14em] text-subtle">Inter-entity loan</p>
                <p className="text-sm">Running balance {inr(loan.amountInr)}. Income landed recently — settle from Finance.</p>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}

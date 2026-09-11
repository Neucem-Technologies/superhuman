import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge, Button, Card, SectionTitle, Segmented } from "@/components/ui/primitives";
import { useAppStore } from "@/spine/store";
import { inr, todayKey } from "@/spine/format";
import { cashflowFor, dueSoonTotal, personalCash } from "@/spine/rules";
import { toast } from "sonner";
import { SlideHero } from "@/components/shell/SlideHero";

export function FinanceTab() {
  const [sec, setSec] = useState<"overview" | "bills" | "loans">("overview");
  const accounts = useAppStore((s) => s.accounts);
  const txns = useAppStore((s) => s.txns);
  const bills = useAppStore((s) => s.bills);
  const loans = useAppStore((s) => s.loans);
  const businesses = useAppStore((s) => s.businesses);
  const trips = useAppStore((s) => s.trips);
  const act = useAppStore((s) => s.act);
  const personal = personalCash(useAppStore.getState());
  const due = dueSoonTotal(useAppStore.getState());
  const trip = trips.find((t) => t.mode === "personal");
  const cf = trip?.estimateInr ? cashflowFor(useAppStore.getState(), trip.estimateInr) : null;
  const byDay = [6, 5, 4, 3, 2, 1, 0].map((d) => {
    const key = todayKey(Date.now() - d * 86400_000);
    const spend = txns
      .filter((t) => t.accountId === "acc-check" && t.amountInr < 0 && todayKey(t.timestamp) === key)
      .reduce((s, t) => s + -t.amountInr, 0);
    return { d: key.slice(8), spend };
  });

  return (
    <div className="space-y-4">
      <SlideHero slide="finance">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">Finance</h1>
        <p className="mt-0.5 text-sm text-muted">Personal and company pots stay separate.</p>
      </SlideHero>
      <Segmented
        value={sec}
        onChange={setSec}
        options={[
          { id: "overview", label: "Overview" },
          { id: "bills", label: "Bills" },
          { id: "loans", label: "Loans" },
        ]}
      />
      {sec === "overview" && (
        <div className="space-y-3">
          {accounts.map((a) => (
            <Card key={a.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-subtle">{a.kind}</p>
              </div>
              <p className="font-mono text-sm tabular-nums">{inr(a.balanceInr)}</p>
            </Card>
          ))}
          <Card>
            <p className="text-xs uppercase tracking-wide text-subtle">7-day personal spend</p>
            <div className="mt-2 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={byDay}>
                  <defs>
                    <linearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-elevated)",
                      border: "1px solid var(--color-border)",
                      fontSize: 12,
                      color: "var(--color-foreground)",
                    }}
                    formatter={(v) => inr(Number(v))}
                  />
                  <Area type="monotone" dataKey="spend" stroke="var(--color-accent)" fill="url(#sp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <p className="text-sm">
              Personal {inr(personal)} · bills due {inr(due)}
            </p>
            {cf && trip && (
              <p className="mt-1 text-sm text-muted">
                {trip.destination} trip: {cf.message}
              </p>
            )}
          </Card>
          <SectionTitle>Recent</SectionTitle>
          <ul className="space-y-1.5">
            {txns.slice(0, 6).map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <span className="text-muted">{t.merchant}</span>
                <span className={`font-mono tabular-nums ${t.amountInr < 0 ? "text-foreground" : "text-ok"}`}>
                  {inr(t.amountInr)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sec === "bills" && (
        <div className="space-y-2">
          {bills.map((b) => (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{b.name}</p>
                  <p className="text-xs text-muted">
                    due day {b.dueDay} · {b.kind.replace("_", " ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm tabular-nums">{inr(b.amountInr)}</p>
                  <Badge tone={b.status === "paid" ? "ok" : b.status === "queued" ? "accent" : "warn"}>{b.status}</Badge>
                </div>
              </div>
              <div className="mt-2 flex h-6 items-end gap-1">
                {b.trend.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-xs bg-elevated"
                    style={{ height: `${Math.max(20, (v / Math.max(...b.trend)) * 100)}%` }}
                  />
                ))}
              </div>
              {b.status !== "paid" && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { act("finance.bill.queue", { id: b.id }); toast("Queued for Razorpay/Stripe later"); }}>
                    Queue pay
                  </Button>
                  <Button size="sm" onClick={() => { act("finance.bill.pay", { id: b.id }); toast("Marked paid"); }}>
                    Mark paid
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {sec === "loans" && (
        <div className="space-y-2">
          {loans.map((l) => (
            <Card key={l.id}>
              <p className="text-sm font-medium">
                {l.from === "me" ? "You" : l.from} → {l.to === "me" ? "You" : businesses.find((b) => b.id === l.to)?.name ?? l.to}
              </p>
              <p className="font-mono text-lg tabular-nums">{inr(l.amountInr)}</p>
              <p className="text-xs text-muted">{l.note}</p>
              {l.amountInr > 0 && (
                <Button size="sm" className="mt-2" onClick={() => { act("finance.loan.settle", { id: l.id }); toast("Settled"); }}>
                  Settle
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

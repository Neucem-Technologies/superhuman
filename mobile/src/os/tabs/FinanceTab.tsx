import { useState } from "react";
import { Alert, View } from "react-native";
import { useAppStore } from "@/spine/store";
import { inr, todayKey } from "@/spine/format";
import { cashflowFor, dueSoonTotal, personalCash } from "@/spine/rules";
import { Body, Btn, Label, Muted, Screen, Seg, Tile } from "../ui";
import { colors } from "../../theme";

export function FinanceTab() {
  const [sec, setSec] = useState<"overview" | "bills" | "loans">("overview");
  const accounts = useAppStore((s) => s.accounts);
  const bills = useAppStore((s) => s.bills);
  const loans = useAppStore((s) => s.loans);
  const txns = useAppStore((s) => s.txns);
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
  const maxSpend = Math.max(1, ...byDay.map((x) => x.spend));
  return (
    <Screen title="Finance" subtitle="Personal and company pots stay separate.">
      <Seg
        value={sec}
        onChange={setSec}
        options={[
          { id: "overview", label: "Overview" },
          { id: "bills", label: "Bills" },
          { id: "loans", label: "Loans" },
        ]}
      />
      {sec === "overview" && (
        <>
          <Tile>
            <Label>Personal</Label>
            <Body>{inr(personal)}</Body>
            <Muted>Due soon {inr(due)}</Muted>
            {cf && trip ? <Muted>{trip.destination} trip: {cf.message}</Muted> : null}
          </Tile>
          {accounts.map((a) => (
            <Tile key={a.id}>
              <Label>{a.kind}</Label>
              <Body>{a.name}</Body>
              <Muted>{inr(a.balanceInr)}</Muted>
            </Tile>
          ))}
          <Label>7-day personal spend</Label>
          <View style={{ flexDirection: "row", height: 56, alignItems: "flex-end", gap: 6 }}>
            {byDay.map((x) => (
              <View key={x.d} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: "100%",
                    height: Math.max(6, (x.spend / maxSpend) * 40),
                    backgroundColor: colors.accent,
                    borderRadius: 3,
                    opacity: 0.8,
                  }}
                />
                <Muted>{x.d}</Muted>
              </View>
            ))}
          </View>
          {txns.slice(0, 8).map((t) => (
            <Tile key={t.id}>
              <Body>{t.merchant}</Body>
              <Muted>
                {inr(t.amountInr)} · {t.category}
              </Muted>
            </Tile>
          ))}
        </>
      )}
      {sec === "bills" &&
        bills.map((b) => (
          <Tile key={b.id}>
            <Body>{b.name}</Body>
            <Muted>
              {inr(b.amountInr)} · due day {b.dueDay} · {b.kind.replace("_", " ")} · {b.status}
            </Muted>
            <View style={{ flexDirection: "row", height: 24, alignItems: "flex-end", gap: 3 }}>
              {b.trend.map((v, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: Math.max(4, (v / Math.max(...b.trend, 1)) * 24),
                    backgroundColor: colors.elevated,
                    borderRadius: 2,
                  }}
                />
              ))}
            </View>
            {b.status === "due" ? (
              <Btn
                label="Queue"
                onPress={() => {
                  const r = act("finance.bill.queue", { id: b.id });
                  Alert.alert(r.ok ? "Queued" : r.error ?? "Failed");
                }}
              />
            ) : null}
          </Tile>
        ))}
      {sec === "loans" &&
        loans.map((l) => (
          <Tile key={l.id}>
            <Body>
              {l.from} → {l.to}
            </Body>
            <Muted>
              {inr(l.amountInr)} · {l.note}
            </Muted>
            {l.amountInr > 0 ? (
              <Btn
                label="Settle"
                onPress={() => {
                  const r = act("finance.loan.settle", { id: l.id });
                  Alert.alert(r.ok ? "Settled" : r.error ?? "Failed");
                }}
              />
            ) : null}
          </Tile>
        ))}
    </Screen>
  );
}

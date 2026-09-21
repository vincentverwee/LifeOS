import { computeCycleSummary, type Cycle } from "@/lib/data/cycles";
import { formatCurrency } from "@/lib/format";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { BalanceChart } from "@/components/dashboard/BalanceChart";

type CyclePanelProps = {
  cycle: Cycle;
};

export function CyclePanel({ cycle }: CyclePanelProps) {
  const summary = computeCycleSummary(cycle);
  const diff = summary.differenceVsTheoretical;

  return (
    <section className="flex flex-col gap-4">
      <SummaryCards
        cards={[
          {
            label: "Current total balance",
            value: formatCurrency(summary.currentTotalBalance),
          },
          {
            label: "Difference vs theoretical",
            value: diff !== null ? formatCurrency(Math.abs(diff)) : "—",
            tone: diff === null ? "neutral" : diff >= 0 ? "positive" : "negative",
            hint: diff === null ? undefined : diff >= 0 ? "ahead of plan" : "behind plan",
          },
          {
            label: "Amount spent this period",
            value: formatCurrency(summary.amountSpentThisPeriod),
          },
          {
            label: "Projected balance at end",
            value:
              summary.projectedBalanceAtEnd !== null
                ? formatCurrency(summary.projectedBalanceAtEnd)
                : "—",
          },
        ]}
      />
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-medium text-foreground">Theoretical vs actual balance</h3>
        <BalanceChart days={cycle.days} />
      </div>
    </section>
  );
}

import { computeTripSummary, type Trip } from "@/lib/data/trips";
import { formatCurrency } from "@/lib/format";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";

type TripPanelProps = {
  trip: Trip;
};

export function TripPanel({ trip }: TripPanelProps) {
  const summary = computeTripSummary(trip);
  const remaining = summary.totalBudget - summary.totalSpent;
  const overProjected = summary.projectedEndTotal > summary.totalBudget;

  return (
    <section className="flex flex-col gap-4">
      <SummaryCards
        cards={[
          {
            label: "Total spent",
            value: formatCurrency(summary.totalSpent),
          },
          {
            label: "Remaining budget",
            value: formatCurrency(Math.abs(remaining)),
            tone: remaining >= 0 ? "positive" : "negative",
            hint: remaining >= 0 ? undefined : "over budget",
          },
          {
            label: "Projected end total",
            value: formatCurrency(summary.projectedEndTotal),
            tone: overProjected ? "negative" : "neutral",
            hint: overProjected ? "trending over budget" : undefined,
          },
          {
            label: "Days remaining",
            value: `${summary.daysRemaining}`,
          },
        ]}
      />
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 font-medium text-foreground">Spend by category</h3>
        <CategoryBreakdown categories={summary.categories} />
      </div>
    </section>
  );
}

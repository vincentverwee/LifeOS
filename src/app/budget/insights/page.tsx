import { PageHeader } from "@/components/ui/PageHeader";
import { getPeriodData, getPeriodSummaries, resolveActivePeriod, type Period } from "@/lib/data";
import { encodePeriodKey } from "@/lib/period";
import { computeMonthStats, cumulativeAtDay } from "@/lib/monthStats";
import {
  categoryTotalsAtDay,
  comparisonDay,
  earlierMonths,
  labelBaseline,
  labelSummaries,
  type PeriodEntry,
} from "@/lib/insights";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { InsightsHero } from "@/components/insights/InsightsHero";
import { CompareChart, type ComparePoint } from "@/components/insights/CompareChart";
import { earlierColor, earlierName, type EarlierSeries } from "@/lib/earlierSeries";
import { CategoryList, type CategoryRow } from "@/components/insights/CategoryList";
import { PeriodList } from "@/components/insights/PeriodList";
import { LabelChip } from "@/components/insights/LabelChip";
import { MoreDetails } from "@/components/insights/MoreDetails";
import { Disclosure } from "@/components/Disclosure";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 card">
      <h2 className="mb-3 font-medium text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function InsightsPage(props: PageProps<"/budget/insights">) {
  const searchParams = await props.searchParams;
  const requested = Array.isArray(searchParams.period) ? searchParams.period[0] : searchParams.period;

  const [today, summaries] = await Promise.all([getTodayKey(), getPeriodSummaries()]);
  const periods: Period[] = summaries
    .map((m) => ({
      type: m.kind === "trip" ? ("trip" as const) : ("cycle" as const),
      id: m.id,
      name: m.name,
      startDate: `${m.startDate}T00:00:00.000Z`,
      endDate: `${m.endDate}T00:00:00.000Z`,
    }))
    .reverse(); // newest first, like getAllPeriods()
  const activePeriod = resolveActivePeriod(periods, requested, today);

  // Every period as per-day sums (for the comparisons), with the one shown in full detail.
  const activeFull = activePeriod ? await getPeriodData(activePeriod) : null;
  const entries: PeriodEntry[] = summaries.map((summary) => {
    const month = activeFull && summary.id === activeFull.id ? activeFull : summary;
    return { month, stats: computeMonthStats(month, today) };
  });
  const active = activeFull ? entries.find((e) => e.month.id === activeFull.id) : undefined;

  if (!activePeriod || !active) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Insights" back={{ href: "/budget", label: "Budget" }} />
        <EmptyState variant="no-periods" />
      </div>
    );
  }

  const { month, stats } = active;
  const day = comparisonDay(active);
  const baseline = labelBaseline(active, entries, today);

  // Cumulative chart: this period vs the typical peer period vs the budget line, plus the
  // last 6 months' own lines behind a toggle (each cut off after its last day).
  const earlier = earlierMonths(active, entries);
  const earlierSeries: EarlierSeries[] = earlier.map((e) => ({
    key: `m_${e.month.id}`,
    name: earlierName(e.month.startDate, month.startDate),
    color: earlierColor(e.month.startDate),
  }));
  const chart: ComparePoint[] = stats.daily.map((point, i) => {
    const row: ComparePoint = {
      day: point.day,
      actual: point.cumulative,
      typical: baseline ? (baseline.curve[i] ?? null) : null,
      budget: point.budgetLine,
    };
    for (const e of earlier) {
      row[`m_${e.month.id}`] = point.day <= e.stats.daysInMonth ? cumulativeAtDay(e.stats, point.day) : null;
    }
    return row;
  });

  // Categories of this period, each with its delta vs peers and its history.
  const colors = new Map(month.expenses.map((e) => [e.categoryId, e.categoryColor]));
  const totalsNow = categoryTotalsAtDay(month, day);
  const categories: CategoryRow[] = stats.categories
    .filter((c) => c.total > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: colors.get(c.id) ?? "blue",
      total: c.total,
      percent: c.percent,
      delta: baseline ? (totalsNow.get(c.id) ?? 0) - (baseline.categoryAtDay.get(c.id) ?? 0) : null,
      history: entries
        .map((e) => ({
          periodId: e.month.id,
          name: e.month.name,
          label: e.month.label,
          amount: e.stats.categories.find((x) => x.id === c.id)?.total ?? 0,
          active: e.month.id === month.id,
        }))
        .filter((h) => h.amount > 0 || h.active),
    }));

  const labels = [
    ...new Set(summaries.filter((m) => m.kind === "month").map((m) => m.label).filter((l): l is string => !!l)),
  ];
  const typical = baseline ? `typical ${baseline.label} ${formatCurrency(baseline.avgPerDay)}/day` : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <PageHeader
          title="Insights"
          back={{ href: "/budget", label: "Budget" }}
          action={<PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />}
        />
        <LabelChip
          cycleId={month.kind === "month" ? month.id : null}
          label={month.label}
          options={labels}
        />
      </div>

      <InsightsHero month={month} stats={stats} baseline={baseline} day={day} />

      {/* Spent / left are in the hero; these are the two numbers it doesn't show. */}
      <SummaryCards
        cards={[
          {
            label: "Average per day",
            value: formatCurrencyShort(stats.avgPerDay),
            tone: baseline ? (stats.avgPerDay <= baseline.avgPerDay ? "positive" : "negative") : "neutral",
            icon: baseline ? (stats.avgPerDay <= baseline.avgPerDay ? "▼" : "▲") : null,
            hint: typical ?? `day ${day} of ${stats.daysInMonth}`,
          },
          {
            label: "Expected total",
            value: formatCurrencyShort(stats.expectedTotal),
            tone: stats.expectedVsBudget < 0 ? "negative" : "neutral",
            icon: stats.expectedVsBudget < 0 ? "▲" : null,
            hint:
              stats.expectedVsBudget < 0
                ? `${formatCurrencyShort(-stats.expectedVsBudget)} over budget`
                : `${formatCurrencyShort(stats.expectedVsBudget)} under budget`,
          },
        ]}
      />

      <Section title="Spending over the period">
        <CompareChart data={chart} typicalLabel={baseline?.label ?? null} earlier={earlierSeries} />
      </Section>

      <Section title="Categories">
        <CategoryList
          rows={categories}
          typicalLabel={baseline?.label ?? null}
          periodKey={encodePeriodKey(activePeriod)}
        />
      </Section>

      <Disclosure title="All periods">
        <PeriodList entries={entries} summaries={labelSummaries(entries, today)} activeId={month.id} />
      </Disclosure>

      <MoreDetails stats={stats} />
    </div>
  );
}

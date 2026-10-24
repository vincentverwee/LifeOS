import {
  computeCategoryTrend,
  getAllMonths,
  getAllPeriods,
  getCategoryExpenses,
  getCategorySpendTotals,
  getPeriodData,
  resolveActivePeriod,
} from "@/lib/data";
import { encodePeriodKey } from "@/lib/period";
import { computeMonthStats } from "@/lib/monthStats";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CategorySelector } from "@/components/insights/CategorySelector";
import { CategoryTrendChart } from "@/components/insights/CategoryTrendChart";
import { MonthInsights } from "@/components/insights/MonthInsights";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InsightsPage(props: PageProps<"/budget/insights">) {
  const searchParams = await props.searchParams;
  const requestedPeriodKey = first(searchParams.period);
  const requestedCategoryId = first(searchParams.category);

  const today = toDateInputValue();
  const [periods, months, categoryTotals] = await Promise.all([
    getAllPeriods(),
    getAllMonths(),
    getCategorySpendTotals(),
  ]);

  const activePeriod = resolveActivePeriod(periods, requestedPeriodKey, today);
  const activeData = activePeriod ? await getPeriodData(activePeriod) : null;
  const activeEntry = activeData ? { month: activeData, stats: computeMonthStats(activeData, today) } : null;
  const monthEntries = months.map((month) => ({ month, stats: computeMonthStats(month, today) }));

  const usedCategories = categoryTotals.filter((c) => c.expenseCount > 0);
  const activeCategory =
    usedCategories.find((c) => c.id === requestedCategoryId) ?? usedCategories[0] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Look back at any month or trip, then at one category across all of them.
        </p>
      </div>

      {activePeriod && activeEntry ? (
        <section className="flex flex-col gap-4">
          {/* Phones: the period pill doubles as the section title. */}
          <div className="flex items-center justify-between gap-3 sm:items-end">
            <h2 className="text-lg font-semibold text-foreground">
              <span className="sm:hidden">Period</span>
              <span className="hidden sm:inline">{activeEntry.month.name}</span>
            </h2>
            <PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />
          </div>
          <MonthInsights active={activeEntry} all={monthEntries} />
        </section>
      ) : (
        <EmptyState variant="no-periods" />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">By category</h2>
        {activeCategory ? (
          <>
            <CategorySelector categories={usedCategories} activeCategoryId={activeCategory.id} />
            <SummaryCards
              cards={[
                { label: "Total spent", value: formatCurrency(activeCategory.totalSpent) },
                { label: "Expenses", value: `${activeCategory.expenseCount}` },
              ]}
            />
            <CategoryTrendPanel categoryId={activeCategory.id} />
          </>
        ) : (
          <EmptyState variant="category-trend" />
        )}
      </section>
    </div>
  );
}

async function CategoryTrendPanel({ categoryId }: { categoryId: string }) {
  const expenses = await getCategoryExpenses(categoryId);
  const trend = computeCategoryTrend(expenses);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-medium text-foreground">Trend over time</h3>
      <CategoryTrendChart trend={trend} />
    </div>
  );
}

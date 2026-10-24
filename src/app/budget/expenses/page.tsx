import Link from "next/link";
import {
  getAllCategories,
  getAllPeriods,
  getRecentExpenses,
  resolveActivePeriod,
} from "@/lib/data";
import { encodePeriodKey } from "@/lib/period";
import { formatCurrency } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { CategoryFilter, type FilterChip } from "@/components/expenses/CategoryFilter";

export default async function ExpensesPage(props: PageProps<"/budget/expenses">) {
  const searchParams = await props.searchParams;
  const requestedPeriod = searchParams.period;
  const requestedKey = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;

  const periods = await getAllPeriods();
  const activePeriod = resolveActivePeriod(periods, requestedKey, await getTodayKey());

  if (!activePeriod) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
        <EmptyState variant="no-periods" />
      </div>
    );
  }

  const [categories, expenses] = await Promise.all([
    getAllCategories(),
    // Every expense of the period, so anything can be corrected.
    getRecentExpenses(activePeriod, 1000),
  ]);
  // Category chips, biggest first; ?category= narrows the list.
  const chipMap = new Map<string, FilterChip>();
  for (const e of expenses) {
    const chip = chipMap.get(e.categoryId) ?? { id: e.categoryId, name: e.categoryName, color: e.categoryColor, total: 0 };
    chip.total += e.amount;
    chipMap.set(e.categoryId, chip);
  }
  const chips = [...chipMap.values()].sort((a, b) => b.total - a.total);
  const requestedCategory = Array.isArray(searchParams.category) ? searchParams.category[0] : searchParams.category;
  const categoryId = requestedCategory && chipMap.has(requestedCategory) ? requestedCategory : null;
  const shown = categoryId ? expenses.filter((e) => e.categoryId === categoryId) : expenses;
  const total = shown.reduce((sum, e) => sum + e.amount, 0);

  const periodParam = `period=${encodeURIComponent(encodePeriodKey(activePeriod))}`;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center justify-between gap-3 sm:items-end">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Expenses</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {shown.length} · {formatCurrency(total)}
          </p>
        </div>
        <PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />
      </div>

      <CategoryFilter
        chips={chips}
        activeId={categoryId}
        hrefFor={(id) => `/budget/expenses?${periodParam}${id ? `&category=${encodeURIComponent(id)}` : ""}`}
      />

      <ExpenseList
        expenses={shown}
        categories={categories.map(({ id, name, isArchived }) => ({ id, name, isArchived }))}
      />

      <Link
        href={`/budget/add?${periodParam}`}
        className="hidden self-start rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:inline-block"
      >
        + Add expense
      </Link>
    </div>
  );
}

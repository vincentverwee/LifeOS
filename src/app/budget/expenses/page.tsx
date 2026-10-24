import Link from "next/link";
import {
  getAllCategories,
  getAllPeriods,
  getRecentExpenses,
  resolveActivePeriod,
} from "@/lib/data";
import { encodePeriodKey } from "@/lib/period";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ExpenseList } from "@/components/expenses/ExpenseList";

export default async function ExpensesPage(props: PageProps<"/budget/expenses">) {
  const searchParams = await props.searchParams;
  const requestedPeriod = searchParams.period;
  const requestedKey = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;

  const periods = await getAllPeriods();
  const activePeriod = resolveActivePeriod(periods, requestedKey, toDateInputValue());

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
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex items-center justify-between gap-3 sm:items-end">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Expenses</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {expenses.length} · {formatCurrency(total)}
          </p>
        </div>
        <PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />
      </div>

      <ExpenseList
        expenses={expenses}
        categories={categories.map(({ id, name, isArchived }) => ({ id, name, isArchived }))}
      />

      <Link
        href={`/budget/add?period=${encodeURIComponent(encodePeriodKey(activePeriod))}`}
        className="hidden self-start rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:inline-block"
      >
        + Add expense
      </Link>
    </div>
  );
}

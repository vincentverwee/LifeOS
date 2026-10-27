import Link from "next/link";
import {
  getAllCategories,
  getAllPeriods,
  pickEntryDefaults,
  resolveActivePeriod,
} from "@/lib/data";
import { encodePeriodKey } from "@/lib/period";
import { getTodayKey } from "@/lib/today";
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { ExpenseEntryForm } from "@/components/expenses/ExpenseEntryForm";
import { PendingExpenses } from "@/components/expenses/PendingExpenses";

export default async function AddExpensePage(props: PageProps<"/budget/add">) {
  const searchParams = await props.searchParams;
  const requestedPeriod = searchParams.period;
  const requestedKey = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;

  const [periods, todayKey, allCategories] = await Promise.all([getAllPeriods(), getTodayKey(), getAllCategories()]);
  const activePeriod = resolveActivePeriod(periods, requestedKey, todayKey);

  if (!activePeriod) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
        <EmptyState variant="no-periods" />
      </div>
    );
  }

  const activeCategories = allCategories.filter((c) => !c.isArchived);
  const { defaultCategoryId } = pickEntryDefaults(activeCategories);

  // The entry form keeps its own category state, so remount it when the list changes.
  const formKey = [
    encodePeriodKey(activePeriod),
    ...activeCategories.map((c) => `${c.id}:${c.name}:${c.color}`),
  ].join("|");

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex items-center justify-between gap-3 sm:items-end">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Add expense</h1>
        <PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />
      </div>

      <ExpenseEntryForm
        key={formKey}
        period={activePeriod}
        categories={activeCategories}
        defaultCategoryId={defaultCategoryId}
      />

      <PendingExpenses />

      <details id="categories" className="group scroll-mt-4 rounded-xl border border-border bg-surface p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-medium text-foreground">
          Edit categories ({allCategories.length})
          <span className="text-sm font-normal text-ink-muted group-open:hidden">Show</span>
        </summary>
        <p className="mt-2 mb-3 text-sm text-ink-muted">
          Shared by every month and trip. Rename, recolor, reorder or archive them here; give a
          category a pint price to count it as beer.
        </p>
        <CategoryManager categories={allCategories} />
      </details>

      <Link
        href={`/budget/expenses?period=${encodeURIComponent(encodePeriodKey(activePeriod))}`}
        className="btn btn-outline flex min-h-12 justify-between px-5 py-3 text-sm"
      >
        Edit or delete expenses in {activePeriod.name}
        <span aria-hidden="true" className="text-ink-muted">›</span>
      </Link>
    </div>
  );
}

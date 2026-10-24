import {
  getAllCategories,
  getAllPeriods,
  getRecentExpenses,
  pickEntryDefaults,
  resolveActivePeriod,
} from "@/lib/data";
import { encodePeriodKey } from "@/lib/period";
import { toDateInputValue } from "@/lib/format";
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { ExpenseEntryForm } from "@/components/expenses/ExpenseEntryForm";
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

  const [allCategories, recent] = await Promise.all([
    getAllCategories(),
    getRecentExpenses(activePeriod),
  ]);
  const activeCategories = allCategories.filter((c) => !c.isArchived);
  const { defaultCategoryId } = pickEntryDefaults(activeCategories);

  // The entry form keeps its own category state, so remount it when the list changes.
  const formKey = [
    encodePeriodKey(activePeriod),
    ...activeCategories.map((c) => `${c.id}:${c.name}:${c.color}`),
  ].join("|");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
        <PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />
      </div>

      <ExpenseEntryForm
        key={formKey}
        period={activePeriod}
        categories={activeCategories}
        defaultCategoryId={defaultCategoryId}
      />

      <details id="categories" className="group rounded-xl border border-border bg-surface p-4">
        <summary className="flex cursor-pointer items-center justify-between font-medium text-foreground">
          Edit categories ({allCategories.length})
          <span className="text-sm font-normal text-ink-muted group-open:hidden">Show</span>
        </summary>
        <p className="mt-2 mb-3 text-sm text-ink-muted">
          Shared by every month and trip. Rename, recolor, reorder or archive them here; give a
          category a pint price to count it as beer.
        </p>
        <CategoryManager categories={allCategories} />
      </details>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">{activePeriod.name}</h2>
        <ExpenseList expenses={recent} categories={activeCategories} />
      </section>

    </div>
  );
}

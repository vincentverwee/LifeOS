import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
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
import { Disclosure } from "@/components/Disclosure";
import { getPubOptions } from "@/lib/data/beer";

export default async function AddExpensePage(props: PageProps<"/budget/add">) {
  const searchParams = await props.searchParams;
  const requestedPeriod = searchParams.period;
  const requestedKey = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;

  const [periods, todayKey, allCategories, pubs] = await Promise.all([
    getAllPeriods(),
    getTodayKey(),
    getAllCategories(),
    getPubOptions(),
  ]);
  const activePeriod = resolveActivePeriod(periods, requestedKey, todayKey);

  if (!activePeriod) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Add expense" back={{ href: "/budget", label: "Budget" }} />
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
      <PageHeader
        title="Add expense"
        back={{ href: "/budget", label: "Budget" }}
        action={<PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />}
      />

      <ExpenseEntryForm
        key={formKey}
        period={activePeriod}
        categories={activeCategories}
        defaultCategoryId={defaultCategoryId}
        pubs={pubs}
      />

      <PendingExpenses />

      <Disclosure id="categories" title={`Edit categories (${allCategories.length})`}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">
            Shared by every month and trip. Rename, recolor, reorder or archive them here; give a
            category a pint price to count it as beer.
          </p>
          <CategoryManager categories={allCategories} />
        </div>
      </Disclosure>

      <Link
        href={`/budget/expenses?period=${encodeURIComponent(encodePeriodKey(activePeriod))}`}
        className="btn btn-outline flex min-h-12 justify-between px-5 py-3 text-sm"
      >
        Edit or delete expenses in {activePeriod.name}
        <span aria-hidden="true" className="text-ink-muted">›</span>
      </Link>

      <Link href="/budget/subscriptions" className="btn btn-outline -mt-3 flex min-h-12 justify-between px-5 py-3 text-sm sm:-mt-5">
        Subscriptions
        <span aria-hidden="true" className="text-ink-muted">›</span>
      </Link>
    </div>
  );
}

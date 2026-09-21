import {
  getActiveTags,
  getAllPeriods,
  getCategoryUsageForPeriod,
  pickEntryDefaults,
  resolveActivePeriod,
} from "@/lib/data";
import { encodePeriodKey } from "@/lib/period";
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ExpenseEntryForm } from "@/components/expenses/ExpenseEntryForm";

export default async function ExpensesPage(props: PageProps<"/expenses">) {
  const searchParams = await props.searchParams;
  const requestedPeriod = searchParams.period;
  const requestedKey = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;

  const periods = await getAllPeriods();
  const activePeriod = resolveActivePeriod(periods, requestedKey);

  if (!activePeriod) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">Add expense</h1>
        <EmptyState variant="no-periods" />
      </div>
    );
  }

  const [categoryUsage, tags] = await Promise.all([
    getCategoryUsageForPeriod(activePeriod),
    getActiveTags(),
  ]);
  const { chips, defaultCategoryId } = pickEntryDefaults(categoryUsage);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Add expense</h1>
        <PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />
      </div>

      <ExpenseEntryForm
        key={encodePeriodKey(activePeriod)}
        period={activePeriod}
        categories={categoryUsage.map(({ id, name }) => ({ id, name }))}
        chips={chips}
        defaultCategoryId={defaultCategoryId}
        tags={tags}
      />
    </div>
  );
}

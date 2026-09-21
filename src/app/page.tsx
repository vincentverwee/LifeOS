import type { ReactNode } from "react";
import {
  getAllPeriods,
  getCycleWithDays,
  getDebts,
  getSavingsEntries,
  getTripWithExpenses,
  resolveActivePeriod,
} from "@/lib/data";
import { encodePeriodKey } from "@/lib/period";
import { PeriodSwitcher } from "@/components/dashboard/PeriodSwitcher";
import { CyclePanel } from "@/components/dashboard/CyclePanel";
import { TripPanel } from "@/components/dashboard/TripPanel";
import { SavingsTrendChart } from "@/components/dashboard/SavingsTrendChart";
import { DebtsList } from "@/components/dashboard/DebtsList";
import { EmptyState } from "@/components/dashboard/EmptyState";

export default async function DashboardPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const requestedPeriod = searchParams.period;
  const requestedKey = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;

  const [periods, savings, debts] = await Promise.all([
    getAllPeriods(),
    getSavingsEntries(),
    getDebts(),
  ]);

  const activePeriod = resolveActivePeriod(periods, requestedKey);

  let activePanel: ReactNode = null;
  if (activePeriod?.type === "cycle") {
    const cycle = await getCycleWithDays(activePeriod.id);
    if (cycle) activePanel = <CyclePanel cycle={cycle} />;
  } else if (activePeriod?.type === "trip") {
    const trip = await getTripWithExpenses(activePeriod.id);
    if (trip) activePanel = <TripPanel trip={trip} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Budget dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your active budget cycles and trips, at a glance.
          </p>
        </div>
        {periods.length > 0 && activePeriod && (
          <PeriodSwitcher periods={periods} activeKey={encodePeriodKey(activePeriod)} />
        )}
      </div>

      {activePanel ?? <EmptyState variant="no-periods" />}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Savings trend</h2>
        <SavingsTrendChart entries={savings} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Debts</h2>
        <DebtsList debts={debts} />
      </section>
    </div>
  );
}

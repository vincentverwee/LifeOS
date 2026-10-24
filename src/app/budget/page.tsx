import Link from "next/link";
import { connection } from "next/server";
import {
  getAllPeriods,
  getDebts,
  getPeriodData,
  getRunningPeriods,
  getSavingsEntries,
} from "@/lib/data";
import { computeMonthStats } from "@/lib/monthStats";
import { toDateInputValue } from "@/lib/format";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { SavingsTrendChart } from "@/components/dashboard/SavingsTrendChart";
import { DebtsList } from "@/components/dashboard/DebtsList";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default async function TodayPage() {
  // "Today" must be computed per request, never at build time.
  await connection();
  const todayKey = toDateInputValue();

  const [periods, savings, debts] = await Promise.all([
    getAllPeriods(),
    getSavingsEntries(),
    getDebts(),
  ]);

  // Everything running today: the current month, plus any trip you're on.
  const running = getRunningPeriods(periods, todayKey);
  const panels = (
    await Promise.all(
      running.map(async (period) => {
        const data = await getPeriodData(period);
        return data ? { data, stats: computeMonthStats(data, todayKey) } : null;
      })
    )
  ).filter((p) => p !== null);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Today</h1>
          <p className="mt-1 text-sm capitalize text-ink-muted">
            {dateFormatter.format(new Date())}
          </p>
        </div>
        <Link
          href="/budget/expenses"
          className="hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:inline-block"
        >
          + Add expense
        </Link>
      </div>

      {panels.map(({ data, stats }) => (
        <TodayPanel key={data.id} month={data} stats={stats} />
      ))}

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

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatLongDay } from "@/lib/format";
import { Suspense } from "react";
import { getDebts, getPeriodData, getPeriodSummaries, getSavingsEntries } from "@/lib/data";
import { computeMonthStats, cumulativeAtDay } from "@/lib/monthStats";
import { labelBaseline, previousMonth, type PeriodEntry } from "@/lib/insights";
import { getTimeZone, dayKeyIn } from "@/lib/today";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import type { PaceRow } from "@/components/dashboard/PaceComparison";
import { SavingsTrendChart } from "@/components/dashboard/SavingsTrendChart";
import { DebtsList } from "@/components/dashboard/DebtsList";
import { getDueSubscriptions } from "@/lib/data/subscriptions";
import { DueSubscriptions } from "@/components/subscriptions/DueSubscriptions";

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000);
}

/** Same-day comparisons for a running month: last month, and the typical month of its label. */
function comparisonsFor(active: PeriodEntry, all: PeriodEntry[], todayKey: string): PaceRow[] {
  if (active.month.kind !== "month") return [];
  const day = active.stats.daysElapsed;
  const rows: PaceRow[] = [];

  const previous = previousMonth(active, all);
  if (previous) {
    rows.push({
      title: previous.month.name,
      theirs: cumulativeAtDay(previous.stats, day),
      fullPeriod: previous.stats.daysInMonth >= day,
    });
  }

  // Skip the typical month when it's just last month again.
  const baseline = labelBaseline(active, all, todayKey);
  const onlyPeerIsPrevious =
    baseline?.peerCount === 1 && previous !== null && previous.month.label === baseline.label;
  if (baseline && !onlyPeerIsPrevious) {
    rows.push({
      title: `a typical ${baseline.label} month`,
      theirs: baseline.atDay,
      fullPeriod: true,
    });
  }
  return rows;
}

export default async function TodayPage() {
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);

  // History as per-day sums (for the comparisons), full rows only for what runs today.
  const summaries = await getPeriodSummaries();
  const entries: PeriodEntry[] = summaries.map((month) => ({
    month,
    stats: computeMonthStats(month, todayKey),
  }));
  // Everything running today: a trip you're on first, then the current month.
  const runningSummaries = entries
    .filter((e) => e.stats.isCurrent)
    .sort((a, b) =>
      a.month.kind === b.month.kind
        ? b.month.startDate.localeCompare(a.month.startDate)
        : a.month.kind === "trip"
          ? -1
          : 1
    );
  const running = (
    await Promise.all(
      runningSummaries.map((e) => getPeriodData({ type: e.month.kind === "trip" ? "trip" : "cycle", id: e.month.id }))
    )
  )
    .filter((m) => m !== null)
    .map((month) => ({ month, stats: computeMonthStats(month, todayKey) }));

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader section="budget"
        title="Budget"
        subtitle={formatLongDay(todayKey)}
        action={
          <Link
            href="/budget/add"
            className="btn btn-primary hidden px-5 py-2.5 text-sm font-semibold sm:inline-flex"
          >
            + Add expense
          </Link>
        }
      />

      <Suspense>
        <DueSubscriptionsCard todayKey={todayKey} />
      </Suspense>

      {running.map((entry, i) => (
        <TodayPanel
          key={entry.month.id}
          compact={i > 0}
          month={entry.month}
          stats={entry.stats}
          todayKey={todayKey}
          comparisons={comparisonsFor(entry, entries, todayKey)}
          balancesAge={
            entry.month.balancesUpdatedAt
              ? daysBetween(dayKeyIn(tz, new Date(entry.month.balancesUpdatedAt)), todayKey)
              : null
          }
        />
      ))}

      {/* Streams in after the Today panel. */}
      <Suspense>
        <SavingsAndDebts />
      </Suspense>
    </div>
  );
}

async function DueSubscriptionsCard({ todayKey }: { todayKey: string }) {
  const due = await getDueSubscriptions(todayKey);
  return due.length > 0 ? <DueSubscriptions due={due} todayKey={todayKey} /> : null;
}

/** Display-only for now: only shown once there's something in them. */
async function SavingsAndDebts() {
  const [savings, debts] = await Promise.all([getSavingsEntries(), getDebts()]);
  return (
    <>
      {savings.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Savings trend</h2>
          <SavingsTrendChart entries={savings} />
        </section>
      )}

      {debts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Debts</h2>
          <DebtsList debts={debts} />
        </section>
      )}
    </>
  );
}

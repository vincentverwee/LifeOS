import Link from "next/link";
import { connection } from "next/server";
import { getSettingsData } from "@/lib/data";
import { NewTripForm } from "@/components/settings/NewTripForm";
import { TripList } from "@/components/settings/TripList";
import { MonthList } from "@/components/settings/MonthList";

export default async function SettingsPage() {
  await connection(); // live data, never prerendered at build time
  const { trips, months } = await getSettingsData();
  const labels = [...new Set(months.map((m) => m.label).filter((l): l is string => !!l))];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Months are created automatically. Add a trip when you want a separate budget for it.
        </p>
      </div>

      <Link
        href="/budget/subscriptions"
        className="tap flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
      >
        <span className="flex flex-col">
          <span className="font-medium text-foreground">Subscriptions</span>
          <span className="text-sm text-ink-muted">Recurring charges to log with one tap on their renewal day.</span>
        </span>
        <span aria-hidden="true" className="text-xl text-ink-muted">
          ›
        </span>
      </Link>

      <NewTripForm />

      {trips.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 font-medium text-foreground">Trips</h2>
          <TripList trips={trips} />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="px-1">
          <h2 className="font-medium text-foreground">Months</h2>
          <p className="text-sm text-ink-muted">
            Each month&apos;s budget, and which months it&apos;s compared with in Insights.
          </p>
        </div>
        <MonthList months={months} labels={labels} />
      </section>
    </div>
  );
}

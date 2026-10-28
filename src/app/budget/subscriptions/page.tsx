import Link from "next/link";
import { getActiveCategories } from "@/lib/data";
import { getSubscriptions, type SubscriptionRow } from "@/lib/data/subscriptions";
import { getTodayKey } from "@/lib/today";
import { formatCurrency } from "@/lib/format";
import { describeRenewal, describeSchedule, monthlyCost, yearlyCost } from "@/lib/subscriptions/schedule";
import { Disclosure } from "@/components/Disclosure";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";

function SubscriptionList({ subscriptions, todayKey }: { subscriptions: SubscriptionRow[]; todayKey: string }) {
  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-surface">
      {subscriptions.map((s) => (
        <li key={s.id} className="border-b border-border last:border-b-0">
          <Link href={`/budget/subscriptions/${s.id}`} className="tap flex min-h-14 items-center gap-2.5 px-4 py-2.5">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-tag-${s.category.color})` }} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
              <span className="truncate text-xs text-ink-muted">
                {describeSchedule(s)}
                {s.isActive ? ` · next ${describeRenewal(s.nextDueOn, todayKey)}` : " · stopped"}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">{formatCurrency(s.amount)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function SubscriptionsPage() {
  const [subscriptions, categories, todayKey] = await Promise.all([getSubscriptions(), getActiveCategories(), getTodayKey()]);
  const active = subscriptions.filter((s) => s.isActive);
  const stopped = subscriptions.filter((s) => !s.isActive);
  const perMonth = active.reduce((sum, s) => sum + monthlyCost(s), 0);
  const perYear = active.reduce((sum, s) => sum + yearlyCost(s), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/budget/settings" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Settings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Subscriptions</h1>
        <p className="mt-1 text-sm text-ink-muted">
          On the renewal day they show up on Today to log with one tap. Nothing is logged by itself.
        </p>
      </div>

      {active.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(perMonth)}</p>
            <p className="text-sm text-ink-muted">a month</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(perYear)}</p>
            <p className="text-sm text-ink-muted">a year</p>
          </div>
        </div>
      )}

      {active.length > 0 && <SubscriptionList subscriptions={active} todayKey={todayKey} />}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 font-medium text-foreground">New subscription</h2>
        <div className="rounded-xl border border-border bg-surface p-4">
          <SubscriptionForm categories={categories} todayKey={todayKey} />
        </div>
      </section>

      {stopped.length > 0 && (
        <Disclosure title={`Stopped (${stopped.length})`}>
          <SubscriptionList subscriptions={stopped} todayKey={todayKey} />
        </Disclosure>
      )}
    </div>
  );
}

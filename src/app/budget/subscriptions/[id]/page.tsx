import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveCategories } from "@/lib/data";
import { getSubscription, type SubscriptionCharge } from "@/lib/data/subscriptions";
import { getTodayKey } from "@/lib/today";
import { formatCurrency, formatDate } from "@/lib/format";
import { Disclosure } from "@/components/Disclosure";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { SubscriptionActions } from "@/components/subscriptions/SubscriptionActions";

const SHOWN_CHARGES = 6;

/** Charges latest first; one that cost something else than the charge before it shows the change. */
function ChargeList({ charges, limit = charges.length }: { charges: SubscriptionCharge[]; limit?: number }) {
  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-surface">
      {charges.slice(0, limit).map((c, i) => {
        const before = charges[i + 1];
        const changed = before && before.amount !== c.amount;
        return (
          <li key={c.id} className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2 text-sm last:border-b-0">
            <span className="text-foreground">{formatDate(c.date)}</span>
            <span className="font-mono tabular-nums text-foreground">
              {changed && <span className="text-ink-muted">{formatCurrency(before.amount)} → </span>}
              {formatCurrency(c.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default async function SubscriptionPage({ params }: PageProps<"/budget/subscriptions/[id]">) {
  const { id } = await params;
  const [found, categories, todayKey] = await Promise.all([getSubscription(id), getActiveCategories(), getTodayKey()]);
  if (!found) notFound();
  const { subscription, charges } = found;
  const total = charges.reduce((sum, c) => sum + c.amount, 0);
  // Its category stays pickable even when archived since.
  const options = categories.some((c) => c.id === subscription.categoryId)
    ? categories
    : [...categories, { id: subscription.categoryId, ...subscription.category }];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/budget/subscriptions" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Subscriptions
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{subscription.name}</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <SubscriptionForm subscription={subscription} categories={options} todayKey={todayKey} />
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="font-medium text-foreground">Charges</h2>
          {charges.length > 0 && (
            <span className="font-mono text-sm tabular-nums text-ink-muted">
              {formatCurrency(total)} in {charges.length} {charges.length === 1 ? "charge" : "charges"}
            </span>
          )}
        </div>
        {charges.length === 0 ? (
          <p className="px-1 text-sm text-ink-muted">Nothing logged yet. Renewals you log on Today show up here.</p>
        ) : (
          <>
            <ChargeList charges={charges} limit={SHOWN_CHARGES} />
            {charges.length > SHOWN_CHARGES && (
              <Disclosure title={`Show all ${charges.length}`}>
                <ChargeList charges={charges} />
              </Disclosure>
            )}
          </>
        )}
      </section>

      <SubscriptionActions id={subscription.id} name={subscription.name} isActive={subscription.isActive} />
    </div>
  );
}

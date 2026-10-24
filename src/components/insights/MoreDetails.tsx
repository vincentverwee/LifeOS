import type { MonthStats } from "@/lib/monthStats";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { WeekdayChart } from "@/components/insights/WeekdayChart";

/** The deeper cuts, folded away so the page stays calm: weekdays, priciest days, beer. */
export function MoreDetails({ stats }: { stats: MonthStats }) {
  const hasBeer = stats.beer.pints > 0;

  return (
    <details className="group rounded-xl border border-border bg-surface p-4">
      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between font-medium text-foreground">
        More details
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-4 flex flex-col gap-6">
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Average per weekday</h3>
          <WeekdayChart weekdays={stats.weekdays} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">Priciest days</h3>
          {stats.topDays.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing yet.</p>
          ) : (
            <ol className="flex flex-col">
              {stats.topDays.map((d) => (
                <li
                  key={d.date}
                  className="flex min-h-10 items-center justify-between gap-2 border-b border-border text-sm last:border-b-0"
                >
                  <span className="text-foreground">
                    {formatDate(d.date)}
                    <span className="ml-2 text-ink-muted">mostly {d.topCategory}</span>
                  </span>
                  <span className="font-mono tabular-nums text-foreground">{formatCurrency(d.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {hasBeer && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">🍺 Beer</h3>
            <dl className="grid grid-cols-2 gap-3">
              <Stat label="Spent on beer" value={formatCurrency(stats.beer.spend)} />
              <Stat label="Share of spending" value={formatPercent(stats.beer.percentOfSpend)} />
              <Stat label="Estimated pints" value={`${stats.beer.pints}`} />
              <Stat
                label="Per pint"
                value={stats.beer.avgPricePerPint !== null ? formatCurrency(stats.beer.avgPricePerPint) : "—"}
              />
            </dl>
          </div>
        )}
      </div>
    </details>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-mono text-base font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { FundDot } from "@/components/invest/FundDot";
import { getFunds, getTrades } from "@/lib/data/invest";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatPrice, formatUnits } from "@/lib/invest/format";
import { cashIn } from "@/lib/invest/stats";
import { TRADE_LABELS } from "@/lib/invest/types";

export const metadata = { title: "Trades" };

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function TradesPage({ searchParams }: PageProps<"/invest/trades">) {
  const [{ fund: fundParam }, funds, all] = await Promise.all([searchParams, getFunds(), getTrades()]);
  const byId = new Map(funds.map((f) => [f.id, f]));
  const fundId = typeof fundParam === "string" && byId.has(fundParam) ? fundParam : null;
  const trades = fundId ? all.filter((t) => t.instrumentId === fundId) : all;

  const months: { key: string; label: string; trades: typeof trades }[] = [];
  for (const t of trades) {
    const key = t.date.slice(0, 7);
    if (months.at(-1)?.key !== key) months.push({ key, label: monthFormatter.format(new Date(`${key}-01T00:00:00Z`)), trades: [] });
    months.at(-1)!.trades.push(t);
  }
  const usedFunds = funds.filter((f) => all.some((t) => t.instrumentId === f.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trades"
        back={{ href: "/invest", label: "Investments" }}
        action={
          <Link href="/invest/add" className="btn btn-primary hidden min-h-11 px-4 text-sm sm:inline-flex">
            + Log a trade
          </Link>
        }
      />

      {usedFunds.length > 1 && (
        <nav aria-label="Filter by fund" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link
            href="/invest/trades"
            aria-current={!fundId ? "page" : undefined}
            className={`btn inline-flex min-h-11 shrink-0 px-4 text-sm ${!fundId ? "bg-primary text-primary-foreground" : "btn-outline"}`}
          >
            All
          </Link>
          {usedFunds.map((f) => (
            <Link
              key={f.id}
              href={`/invest/trades?fund=${f.id}`}
              aria-current={fundId === f.id ? "page" : undefined}
              className={`btn inline-flex min-h-11 shrink-0 gap-2 px-4 text-sm ${fundId === f.id ? "bg-primary text-primary-foreground" : "btn-outline"}`}
            >
              <FundDot color={f.color} className="h-2 w-2" />
              {f.ticker}
            </Link>
          ))}
        </nav>
      )}

      {months.length === 0 && <p className="text-sm text-ink-muted">No trades yet.</p>}

      {months.map((m) => {
        const net = m.trades.reduce((s, t) => s + (t.type === "dividend" ? 0 : cashIn(t)), 0);
        return (
          <section key={m.key}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="section-title">{m.label}</h2>
              {net !== 0 && <span className="text-sm text-ink-muted tabular-nums">{net > 0 ? `Put in ${formatCurrency(net)}` : `Out ${formatCurrency(-net)}`}</span>}
            </div>
            <ul className="card-list">
              {m.trades.map((t) => {
                const f = byId.get(t.instrumentId);
                return (
                  <li key={t.id}>
                    <Link href={`/invest/trades/${t.id}`} className="tap flex items-center gap-3 p-4">
                      <FundDot color={f?.color ?? "blue"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {TRADE_LABELS[t.type]} · {f?.ticker ?? "?"}
                        </p>
                        <p className="truncate text-sm text-ink-muted tabular-nums">
                          {formatDate(t.date)}
                          {t.type !== "dividend" && ` · ${formatUnits(t.units ?? 0)} × ${formatPrice(t.price ?? 0)}`}
                          {t.fees + t.tax > 0 && ` · costs ${formatCurrency(t.fees + t.tax)}`}
                          {t.note && ` · ${t.note}`}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium tabular-nums text-foreground">{formatCurrency(Math.abs(cashIn(t)))}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

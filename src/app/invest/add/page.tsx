import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { TradeForm } from "@/components/invest/TradeForm";
import { getPortfolio } from "@/lib/data/invest";
import { getTodayKey } from "@/lib/today";

export const metadata = { title: "Log a trade" };

export default async function AddTradePage({ searchParams }: PageProps<"/invest/add">) {
  const [{ fund }, todayKey, { funds, trades, prices }] = await Promise.all([searchParams, getTodayKey(), getPortfolio()]);
  // Each fund's newest stored close: the starting price for "Same as last buy".
  const latestClose = Object.fromEntries(Object.entries(prices).flatMap(([id, list]) => (list.length ? [[id, list.at(-1)!.close]] : [])));
  const active = funds.filter((f) => !f.isArchived);
  const lastBuy = trades.find((t) => t.type === "buy" && active.some((f) => f.id === t.instrumentId)) ?? null;
  const lastFee = trades.find((t) => t.type !== "dividend")?.fees ?? null;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Log a trade" subtitle="Copy the numbers from Bolero's order confirmation." back={{ href: "/invest", label: "Investments" }} />
      {active.length === 0 ? (
        <section className="card flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-ink-muted">Add a fund first, then log what you bought.</p>
          <Link href="/invest/settings" className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
            Add a fund
          </Link>
        </section>
      ) : (
        <TradeForm
          funds={active}
          todayKey={todayKey}
          lastBuy={lastBuy}
          lastFee={lastFee}
          latestClose={latestClose}
          initialFundId={typeof fund === "string" ? fund : null}
        />
      )}
    </div>
  );
}

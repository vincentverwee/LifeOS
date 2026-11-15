import { PageHeader } from "@/components/ui/PageHeader";
import { AddFund, FundRow } from "@/components/invest/FundSettings";
import { getFunds } from "@/lib/data/invest";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Investment settings" };

export default async function InvestSettingsPage() {
  const [funds, counts] = await Promise.all([getFunds(), prisma.investmentTx.groupBy({ by: ["instrumentId"], _count: { _all: true } })]);
  const count = new Map(counts.map((c) => [c.instrumentId, c._count._all]));
  const active = funds.filter((f) => !f.isArchived);
  const archived = funds.filter((f) => f.isArchived);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" back={{ href: "/invest", label: "Investments" }} />

      {active.length > 0 && (
        <section>
          <h2 className="section-title mb-2">Your funds</h2>
          <ul className="card-list">
            {active.map((f) => (
              <FundRow key={f.id} fund={f} tradeCount={count.get(f.id) ?? 0} />
            ))}
          </ul>
        </section>
      )}

      <AddFund />

      {archived.length > 0 && (
        <section>
          <h2 className="section-title mb-2">Archived</h2>
          <p className="mb-2 text-sm text-ink-muted">Kept for their trades; prices aren&apos;t updated.</p>
          <ul className="card-list">
            {archived.map((f) => (
              <FundRow key={f.id} fund={f} tradeCount={count.get(f.id) ?? 0} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

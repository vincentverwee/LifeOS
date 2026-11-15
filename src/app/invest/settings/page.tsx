import { PageHeader } from "@/components/ui/PageHeader";
import { AddFund, FundList } from "@/components/invest/FundSettings";
import { SavingsAccountList } from "@/components/invest/SavingsSettings";
import { getSavingsAccounts } from "@/lib/data/inflation";
import { getFunds } from "@/lib/data/invest";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Investment settings" };

export default async function InvestSettingsPage() {
  const [funds, counts, accounts] = await Promise.all([
    getFunds(),
    prisma.investmentTx.groupBy({ by: ["instrumentId"], _count: { _all: true } }),
    getSavingsAccounts(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" back={{ href: "/invest", label: "Investments" }} />

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Your funds</h2>
        <div className="card p-5">
          <FundList funds={funds} counts={Object.fromEntries(counts.map((c) => [c.instrumentId, c._count._all]))} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Add a fund</h2>
        <div className="card p-5">
          <AddFund />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Savings accounts</h2>
        <div className="card p-5">
          <SavingsAccountList
            accounts={accounts.map((a) => ({ id: a.id, name: a.name, ratePct: a.ratePct, color: a.color, isArchived: a.isArchived, balances: a.balances.length }))}
          />
        </div>
      </section>
    </div>
  );
}

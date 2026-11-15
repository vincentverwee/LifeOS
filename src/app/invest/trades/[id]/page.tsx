import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { TradeForm } from "@/components/invest/TradeForm";
import { getFunds, toTrade } from "@/lib/data/invest";
import { prisma } from "@/lib/prisma";
import { getTodayKey } from "@/lib/today";

export const metadata = { title: "Edit trade" };

export default async function EditTradePage({ params }: PageProps<"/invest/trades/[id]">) {
  const { id } = await params;
  const [row, funds, todayKey] = await Promise.all([prisma.investmentTx.findUnique({ where: { id } }), getFunds(), getTodayKey()]);
  if (!row) notFound();
  const trade = toTrade(row);
  // An archived fund stays pickable for its own trades.
  const choices = funds.filter((f) => !f.isArchived || f.id === trade.instrumentId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit trade" back={{ href: "/invest/trades", label: "Trades" }} />
      <TradeForm funds={choices} todayKey={todayKey} trade={trade} />
    </div>
  );
}

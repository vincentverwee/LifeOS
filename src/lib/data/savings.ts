import "server-only";
import { prisma } from "@/lib/prisma";

export type SavingsEntry = {
  id: string;
  transactionNumber: number;
  runningTotal: number;
  bonusAmount: number | null;
  date: string;
};

export async function getSavingsEntries(): Promise<SavingsEntry[]> {
  const entries = await prisma.savingsEntry.findMany({
    orderBy: { date: "asc" },
  });

  return entries.map((entry) => ({
    id: entry.id,
    transactionNumber: entry.transactionNumber,
    runningTotal: entry.runningTotal.toNumber(),
    bonusAmount: entry.bonusAmount?.toNumber() ?? null,
    date: entry.date.toISOString(),
  }));
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { toDateInputValue } from "@/lib/format";

const DEFAULT_BUDGET = 1000;

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maart",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Augustus",
  "September",
  "Oktober",
  "November",
  "December",
];

// Arbitrary constant: serialises concurrent first-loads of a new month.
const MONTH_LOCK_KEY = 7_311_001;

/**
 * Months are automatic: the first time anything needs the periods in a new
 * calendar month, that month is created from the latest earlier one
 * (budget, rent, rent day, balances). Only trips are manual.
 * Safe to call on every request — it's a single lookup when the month exists.
 */
export async function ensureCurrentMonth(): Promise<void> {
  const [year, month] = toDateInputValue().split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1));

  const exists = await prisma.budgetCycle.findFirst({ where: { startDate }, select: { id: true } });
  if (exists) return;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${MONTH_LOCK_KEY})`;

    // Re-check under the lock: a concurrent request may have just created it.
    if (await tx.budgetCycle.findFirst({ where: { startDate }, select: { id: true } })) return;

    const previous = await tx.budgetCycle.findFirst({
      where: { startDate: { lt: startDate } },
      orderBy: { startDate: "desc" },
    });

    await tx.budgetCycle.create({
      data: {
        name: `${MONTH_NAMES[month - 1]} ${year}`,
        startingBudget: previous?.startingBudget ?? DEFAULT_BUDGET,
        startDate,
        endDate: new Date(Date.UTC(year, month, 0)),
        rent: previous?.rent ?? 0,
        rentDay: previous?.rentDay ?? null,
        label: previous?.label ?? null,
        bank: previous?.bank ?? 0,
        tricount: previous?.tricount ?? 0,
        cash: previous?.cash ?? 0,
      },
    });
  });
}

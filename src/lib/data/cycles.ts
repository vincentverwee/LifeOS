import "server-only";
import { prisma } from "@/lib/prisma";

export type CycleDay = {
  id: string;
  date: string;
  theoreticalBalance: number;
  dailyGoal: number;
  cashBalance: number | null;
  bankBalance: number | null;
  totalBalance: number | null;
  amountSpent: number | null;
  notes: string | null;
};

export type Cycle = {
  id: string;
  name: string;
  startingBudget: number;
  startDate: string;
  endDate: string;
  days: CycleDay[];
};

export type CycleSummary = {
  currentTotalBalance: number;
  differenceVsTheoretical: number | null;
  amountSpentThisPeriod: number;
  projectedBalanceAtEnd: number | null;
};

export async function getCycleWithDays(id: string): Promise<Cycle | null> {
  const cycle = await prisma.budgetCycle.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" } } },
  });
  if (!cycle) return null;

  return {
    id: cycle.id,
    name: cycle.name,
    startingBudget: cycle.startingBudget.toNumber(),
    startDate: cycle.startDate.toISOString(),
    endDate: cycle.endDate.toISOString(),
    days: cycle.days.map((day) => ({
      id: day.id,
      date: day.date.toISOString(),
      theoreticalBalance: day.theoreticalBalance.toNumber(),
      dailyGoal: day.dailyGoal.toNumber(),
      cashBalance: day.cashBalance?.toNumber() ?? null,
      bankBalance: day.bankBalance?.toNumber() ?? null,
      totalBalance: day.totalBalance?.toNumber() ?? null,
      amountSpent: day.amountSpent?.toNumber() ?? null,
      notes: day.notes,
    })),
  };
}

export function computeCycleSummary(cycle: Cycle): CycleSummary {
  const loggedDays = cycle.days.filter((day) => day.totalBalance !== null);
  const latestLoggedDay = loggedDays.at(-1);
  const lastDay = cycle.days.at(-1);

  const currentTotalBalance = latestLoggedDay?.totalBalance ?? cycle.startingBudget;
  const differenceVsTheoretical = latestLoggedDay
    ? latestLoggedDay.totalBalance! - latestLoggedDay.theoreticalBalance
    : null;
  const amountSpentThisPeriod = cycle.days.reduce(
    (sum, day) => sum + (day.amountSpent ?? 0),
    0
  );
  const projectedBalanceAtEnd = lastDay?.theoreticalBalance ?? null;

  return {
    currentTotalBalance,
    differenceVsTheoretical,
    amountSpentThisPeriod,
    projectedBalanceAtEnd,
  };
}

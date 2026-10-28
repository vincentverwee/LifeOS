import "server-only";
import { getAllPeriods, getPeriodData, getRunningPeriods } from "@/lib/data";
import { computeMonthStats } from "@/lib/monthStats";
import { formatCurrency } from "@/lib/format";

export type BudgetGlance = {
  /** "€ 23,65" */
  amount: string;
  /** "left today" / "over today" / "over budget" */
  label: string;
  over: boolean;
  spent: number;
  budget: number;
  /** share of the period's days that has passed, today included (0–1) */
  timeProgress: number;
  daysLeft: number;
  /** any expense dated today */
  loggedToday: boolean;
};

/** Today's allowance and the period's progress, from the period running today. */
export async function budgetGlance(todayKey: string): Promise<BudgetGlance | null> {
  const running = getRunningPeriods(await getAllPeriods(), todayKey)[0];
  if (!running) return null;
  const data = await getPeriodData(running);
  if (!data) return null;
  const stats = computeMonthStats(data, todayKey);
  const today = stats.today;
  if (!today) return null;

  const progress = {
    spent: stats.spent,
    budget: data.budget,
    timeProgress: stats.daysElapsed / stats.daysInMonth,
    daysLeft: today.daysLeftInclToday,
    loggedToday: data.expenses.some((e) => e.date === todayKey),
  };
  if (today.budgetGoneBeforeToday) {
    return { amount: formatCurrency(-today.budgetLeft), label: "over budget", over: true, ...progress };
  }
  const over = today.leftToday < 0;
  return {
    amount: formatCurrency(Math.abs(today.leftToday)),
    label: over ? "over today" : "left today",
    over,
    ...progress,
  };
}

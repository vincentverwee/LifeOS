// Pure month math (no server-only imports) so server components, client
// charts and the import script can all share it. Mirrors the formulas of the
// BudgetGalway.xlsx month sheets.

export type MonthExpense = {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  amount: number;
  note: string | null;
  categoryId: string;
  categoryName: string;
  /** palette slot key (see categoryPalette.ts) */
  categoryColor: string;
  /** price of one pint if the expense's category counts as beer */
  pintPrice: number | null;
  /** pints counted when it was logged (null = guessed from pintPrice, see pintsOf) */
  pints: number | null;
  /** the pub it was bought at (beer only) */
  pubName: string | null;
};

export type Month = {
  /** a calendar month or a trip — both are budgeted date ranges */
  kind: "month" | "trip";
  id: string;
  name: string;
  /** peer group for comparisons ("Thuis", "Galway"); trips are "Trip" */
  label: string | null;
  budget: number;
  /** "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
  bank: number;
  tricount: number;
  cash: number;
  balancesUpdatedAt: string | null;
  rent: number;
  rentDay: number | null;
  expenses: MonthExpense[];
};

/** Beer purchases below this are treated as food, not pints (as in the sheet). */
export const MIN_PINT_AMOUNT = 5;

/** The guess for a beer without a counted number: amount ÷ the pint price, at least 1. */
export function guessPints(amount: number, pintPrice: number): number {
  return Math.max(1, Math.round(amount / pintPrice));
}

/** Pints in a beer expense: the counted number, else the guess (0 = not beer, or food). */
export function pintsOf(e: Pick<MonthExpense, "amount" | "pintPrice" | "pints">): number {
  if (!e.pintPrice || e.pintPrice <= 0) return 0;
  if (e.pints) return e.pints;
  return e.amount < MIN_PINT_AMOUNT ? 0 : guessPints(e.amount, e.pintPrice);
}

const MS_PER_DAY = 86_400_000;

export const WEEKDAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const;

function utc(key: string): number {
  return Date.parse(`${key}T00:00:00Z`);
}

function addDays(key: string, days: number): string {
  return new Date(utc(key) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6 */
function weekdayIndex(key: string): number {
  return (new Date(utc(key)).getUTCDay() + 6) % 7;
}

export type DailyPoint = {
  date: string;
  day: number;
  total: number;
  /** null for days that haven't happened yet (chart gap) */
  cumulative: number | null;
  budgetLine: number;
};

export type CategoryStat = {
  id: string;
  name: string;
  total: number;
  percent: number;
  daysWithSpend: number;
  avgPerSpendDay: number;
  avgPerDay: number;
  busiestDay: string | null;
  busiestDayAmount: number;
};

export type WeekdayStat = {
  index: number;
  label: string;
  total: number;
  days: number;
  avgPerDay: number;
};

export type TopDay = { date: string; total: number; topCategory: string };

export type BeerStats = {
  spend: number;
  pints: number;
  avgPricePerPint: number | null;
  pintsPerDay: number;
  percentOfSpend: number;
};

export type BalanceOutlook = {
  total: number;
  /** balances minus rent that is still to be paid this month */
  available: number;
  rentStillDue: number;
  /** what you can spend per remaining day (today included) and stay at/above zero; null when the month is over */
  safePerDay: number | null;
  predictedEndBalance: number;
};

export type TodayStats = {
  spentToday: number;
  /** what the rest of the budget allows for each remaining day, today included (never below 0) */
  allowanceToday: number;
  /** the month's budget was already used up before today */
  budgetGoneBeforeToday: boolean;
  /** allowanceToday minus what's already spent today (negative = over) */
  leftToday: number;
  budgetLeft: number;
  /** days remaining including today */
  daysLeftInclToday: number;
  /** budget line minus actual cumulative: positive = under the line */
  vsBudgetLine: number;
};

export type MonthStats = {
  daysInMonth: number;
  daysElapsed: number;
  daysLeft: number;
  isCurrent: boolean;
  /** the period hasn't started yet */
  isFuture: boolean;
  spent: number;
  budgetUsedPercent: number;
  avgPerDay: number;
  expectedTotal: number;
  expectedVsBudget: number;
  daysWithSpend: number;
  avgPerSpendDay: number;
  priciestDay: { date: string; total: number } | null;
  daily: DailyPoint[];
  categories: CategoryStat[];
  weekdays: WeekdayStat[];
  topDays: TopDay[];
  beer: BeerStats;
  outlook: BalanceOutlook;
  /** only for the running period (today falls inside it) */
  today: TodayStats | null;
};

export function computeMonthStats(month: Month, todayKey: string): MonthStats {
  const start = month.startDate;
  const daysInMonth = Math.round((utc(month.endDate) - utc(start)) / MS_PER_DAY) + 1;
  const rawElapsed = Math.round((utc(todayKey) - utc(start)) / MS_PER_DAY) + 1;
  const daysElapsed = Math.max(0, Math.min(daysInMonth, rawElapsed));
  const daysLeft = daysInMonth - daysElapsed;
  const isCurrent = rawElapsed >= 1 && rawElapsed <= daysInMonth;

  // Per-day totals and per-day-per-category amounts.
  const dayTotals = new Map<string, number>();
  const dayCategory = new Map<string, Map<string, number>>();
  for (const e of month.expenses) {
    dayTotals.set(e.date, (dayTotals.get(e.date) ?? 0) + e.amount);
    const cats = dayCategory.get(e.date) ?? new Map<string, number>();
    cats.set(e.categoryName, (cats.get(e.categoryName) ?? 0) + e.amount);
    dayCategory.set(e.date, cats);
  }

  const spent = month.expenses.reduce((sum, e) => sum + e.amount, 0);

  const daily: DailyPoint[] = [];
  let running = 0;
  for (let i = 0; i < daysInMonth; i++) {
    const date = addDays(start, i);
    const total = dayTotals.get(date) ?? 0;
    running += total;
    daily.push({
      date,
      day: i + 1,
      total,
      cumulative: i < daysElapsed ? running : null,
      budgetLine: (month.budget * (i + 1)) / daysInMonth,
    });
  }

  const avgPerDay = daysElapsed > 0 ? spent / daysElapsed : 0;
  const expectedTotal = avgPerDay * daysInMonth;

  const spendDays = [...dayTotals.entries()].filter(([, total]) => total > 0);
  const priciest = spendDays.reduce<[string, number] | null>(
    (best, entry) => (best === null || entry[1] > best[1] ? entry : best),
    null
  );

  // Categories
  const usedCategories = new Map<string, string>();
  for (const e of month.expenses) usedCategories.set(e.categoryId, e.categoryName);
  const categories: CategoryStat[] = [...usedCategories]
    .map(([id, name]) => ({ id, name }))
    .map((cat) => {
      const perDay = new Map<string, number>();
      let total = 0;
      for (const e of month.expenses) {
        if (e.categoryId !== cat.id) continue;
        total += e.amount;
        perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.amount);
      }
      let busiestDay: string | null = null;
      let busiestDayAmount = 0;
      for (const [date, amount] of perDay) {
        if (amount > busiestDayAmount) {
          busiestDay = date;
          busiestDayAmount = amount;
        }
      }
      return {
        id: cat.id,
        name: cat.name,
        total,
        percent: spent > 0 ? (total / spent) * 100 : 0,
        daysWithSpend: perDay.size,
        avgPerSpendDay: perDay.size > 0 ? total / perDay.size : 0,
        avgPerDay: daysElapsed > 0 ? total / daysElapsed : 0,
        busiestDay,
        busiestDayAmount,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Weekdays (only days that have happened count towards the averages)
  const weekdayTotals = Array<number>(7).fill(0);
  const weekdayDays = Array<number>(7).fill(0);
  for (let i = 0; i < daysElapsed; i++) weekdayDays[weekdayIndex(addDays(start, i))]++;
  for (const [date, total] of dayTotals) weekdayTotals[weekdayIndex(date)] += total;
  const weekdays: WeekdayStat[] = WEEKDAY_LABELS.map((label, index) => ({
    index,
    label,
    total: weekdayTotals[index],
    days: weekdayDays[index],
    avgPerDay: weekdayDays[index] > 0 ? weekdayTotals[index] / weekdayDays[index] : 0,
  }));

  // Top 5 priciest days
  const topDays: TopDay[] = spendDays
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([date, total]) => {
      const cats = [...(dayCategory.get(date) ?? [])].sort((a, b) => b[1] - a[1]);
      return { date, total, topCategory: cats[0]?.[0] ?? "—" };
    });

  // Beer: an expense counts as beer when its category has a pint price.
  let beerSpend = 0;
  let pints = 0;
  for (const e of month.expenses) {
    const count = pintsOf(e);
    if (count === 0) continue;
    beerSpend += e.amount;
    pints += count;
  }
  const beer: BeerStats = {
    spend: beerSpend,
    pints,
    avgPricePerPint: pints > 0 ? beerSpend / pints : null,
    pintsPerDay: daysElapsed > 0 ? pints / daysElapsed : 0,
    percentOfSpend: spent > 0 ? (beerSpend / spent) * 100 : 0,
  };

  // Balance outlook (Beschikbaar na huur / Voorspeld saldo / Budget per dag)
  const total = month.bank + month.tricount + month.cash;
  let rentStillDue = 0;
  if (month.rent > 0 && month.rentDay !== null) {
    if (rawElapsed < 1) rentStillDue = month.rent; // month hasn't started
    // Rent day 31 in a 30-day month is paid on the last day.
    else if (isCurrent && daysElapsed <= Math.min(month.rentDay, daysInMonth)) rentStillDue = month.rent;
  }
  const available = total - rentStillDue;
  // Like the daily allowance, today counts as a day still to spend.
  const spendDaysLeft = isCurrent ? daysLeft + 1 : daysLeft;
  const outlook: BalanceOutlook = {
    total,
    available,
    rentStillDue,
    safePerDay: spendDaysLeft > 0 ? available / spendDaysLeft : null,
    predictedEndBalance: available - avgPerDay * daysLeft,
  };

  return {
    daysInMonth,
    daysElapsed,
    daysLeft,
    isCurrent,
    isFuture: rawElapsed < 1,
    spent,
    budgetUsedPercent: month.budget > 0 ? (spent / month.budget) * 100 : 0,
    avgPerDay,
    expectedTotal,
    expectedVsBudget: month.budget - expectedTotal,
    daysWithSpend: spendDays.length,
    avgPerSpendDay: spendDays.length > 0 ? spent / spendDays.length : 0,
    priciestDay: priciest ? { date: priciest[0], total: priciest[1] } : null,
    daily,
    categories,
    weekdays,
    topDays,
    beer,
    outlook,
    today: isCurrent ? computeToday(month, daily, daysElapsed, daysInMonth, spent) : null,
  };
}

function computeToday(
  month: Month,
  daily: DailyPoint[],
  daysElapsed: number,
  daysInMonth: number,
  spent: number
): TodayStats {
  const todayPoint = daily[daysElapsed - 1];
  const spentToday = todayPoint.total;
  const daysLeftInclToday = daysInMonth - daysElapsed + 1;
  const leftBeforeToday = month.budget - (spent - spentToday);
  // Once the budget is gone there's nothing to hand out: the allowance is 0,
  // not the overspend spread over the remaining days.
  const allowanceToday = Math.max(0, leftBeforeToday / daysLeftInclToday);
  return {
    spentToday,
    allowanceToday,
    budgetGoneBeforeToday: leftBeforeToday < 0,
    leftToday: allowanceToday - spentToday,
    budgetLeft: month.budget - spent,
    daysLeftInclToday,
    vsBudgetLine: todayPoint.budgetLine - (todayPoint.cumulative ?? spent),
  };
}

/** Cumulative spend at day-of-month `day` (1-based), clamped to the month length. */
export function cumulativeAtDay(stats: MonthStats, day: number): number {
  const index = Math.min(day, stats.daysInMonth) - 1;
  if (index < 0) return 0;
  let sum = 0;
  for (let i = 0; i <= index; i++) sum += stats.daily[i].total;
  return sum;
}

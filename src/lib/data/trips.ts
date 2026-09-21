import "server-only";
import { prisma } from "@/lib/prisma";

export type TripExpense = {
  id: string;
  date: string;
  amount: number;
  note: string | null;
};

export type TripCategory = {
  id: string;
  name: string;
  expenses: TripExpense[];
};

export type Trip = {
  id: string;
  name: string;
  totalBudget: number;
  startDate: string;
  endDate: string;
  categories: TripCategory[];
};

export type CategoryStat = {
  id: string;
  name: string;
  totalSpent: number;
  dailyAverage: number;
  percentOfBudget: number;
};

export type TripSummary = {
  totalBudget: number;
  totalSpent: number;
  projectedEndTotal: number;
  daysRemaining: number;
  categories: CategoryStat[];
};

export async function getTripWithExpenses(id: string): Promise<Trip | null> {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      categories: {
        include: { expenses: { orderBy: { date: "asc" } } },
      },
    },
  });
  if (!trip) return null;

  return {
    id: trip.id,
    name: trip.name,
    totalBudget: trip.totalBudget.toNumber(),
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    categories: trip.categories.map((category) => ({
      id: category.id,
      name: category.name,
      expenses: category.expenses.map((expense) => ({
        id: expense.id,
        date: expense.date.toISOString(),
        amount: expense.amount.toNumber(),
        note: expense.note,
      })),
    })),
  };
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeTripSummary(trip: Trip): TripSummary {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const today = new Date();

  const totalTripDays = Math.max(
    1,
    Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1
  );
  const elapsedDays = Math.min(
    totalTripDays,
    Math.max(1, Math.round((today.getTime() - startDate.getTime()) / MS_PER_DAY) + 1)
  );
  const daysRemaining = Math.max(0, totalTripDays - elapsedDays);

  const categories: CategoryStat[] = trip.categories
    .map((category) => {
      const totalSpent = category.expenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        id: category.id,
        name: category.name,
        totalSpent,
        dailyAverage: totalSpent / elapsedDays,
        percentOfBudget: trip.totalBudget > 0 ? (totalSpent / trip.totalBudget) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const totalSpent = categories.reduce((sum, c) => sum + c.totalSpent, 0);
  const projectedEndTotal = (totalSpent / elapsedDays) * totalTripDays;

  return {
    totalBudget: trip.totalBudget,
    totalSpent,
    projectedEndTotal,
    daysRemaining,
    categories,
  };
}

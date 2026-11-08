// Pure body-weight math on weigh-ins ("YYYY-MM-DD" keys, any order).
import { addDays } from "@/lib/reminders/schedule";

export type WeighIn = { date: string; kg: number };

export type WeightTrend = {
  latest: WeighIn;
  /** Average of the weigh-ins in the 7 days up to the latest one. */
  average7: number;
  /** Change vs the newest weigh-in at least 30 / 90 days before the latest (null if none that old). */
  change30: number | null;
  change90: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function weightTrend(weighIns: WeighIn[]): WeightTrend | null {
  if (weighIns.length === 0) return null;
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const weekStart = addDays(latest.date, -6);
  const week = sorted.filter((w) => w.date >= weekStart);
  const changeOver = (days: number) => {
    const cutoff = addDays(latest.date, -days);
    const before = sorted.filter((w) => w.date <= cutoff).at(-1);
    return before ? round1(latest.kg - before.kg) : null;
  };
  return {
    latest,
    average7: round1(week.reduce((n, w) => n + w.kg, 0) / week.length),
    change30: changeOver(30),
    change90: changeOver(90),
  };
}

/** "+0,4 kg" / "−1,2 kg" / "±0 kg" */
export function formatChange(kg: number): string {
  if (kg === 0) return "±0 kg";
  const n = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 1 }).format(Math.abs(kg));
  return `${kg > 0 ? "+" : "−"}${n} kg`;
}

export function formatKg(kg: number): string {
  return `${new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 1 }).format(kg)} kg`;
}

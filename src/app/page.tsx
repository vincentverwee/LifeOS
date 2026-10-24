import Link from "next/link";
import { getAllPeriods, getPeriodData, getRunningPeriods } from "@/lib/data";
import { computeMonthStats } from "@/lib/monthStats";
import { formatCurrency } from "@/lib/format";
import { getTodayKey } from "@/lib/today";

type Feature = {
  name: string;
  description: string;
  href?: string;
  emoji: string;
};

const FEATURES: Feature[] = [
  {
    name: "Budget",
    description: "Monthly budgets, trips, expenses and spending insights.",
    href: "/budget",
    emoji: "💶",
  },
  {
    name: "Waypoint",
    description: "Places and plans worth remembering.",
    emoji: "📍",
  },
  {
    name: "Recipes",
    description: "What to cook, and what it needs.",
    emoji: "🍲",
  },
];

/** "€ 23,65 left today" for the Budget card, from the period running today. */
async function budgetGlance(): Promise<{ text: string; over: boolean } | null> {
  const todayKey = await getTodayKey();
  const running = getRunningPeriods(await getAllPeriods(), todayKey)[0];
  if (!running) return null;
  const data = await getPeriodData(running);
  const today = data ? computeMonthStats(data, todayKey).today : null;
  if (!today) return null;
  if (today.budgetGoneBeforeToday) {
    return { text: `${formatCurrency(-today.budgetLeft)} over budget`, over: true };
  }
  const over = today.leftToday < 0;
  return { text: `${formatCurrency(Math.abs(today.leftToday))} ${over ? "over today" : "left today"}`, over };
}

export default async function HomePage() {
  const glance = await budgetGlance();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Life Analytics</h1>
        <p className="mt-1 text-sm text-ink-muted">Your personal data, in one place.</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURES.map((feature) => {
          const body = (
            <>
              <span className="text-3xl" aria-hidden="true">
                {feature.emoji}
              </span>
              <span className="mt-3 block font-medium text-foreground">{feature.name}</span>
              <span className="mt-1 block text-sm text-ink-muted">{feature.description}</span>
              {feature.name === "Budget" && glance && (
                <span
                  className={`mt-3 inline-block rounded-full px-2.5 py-1 font-mono text-sm font-medium tabular-nums ${
                    glance.over ? "bg-critical/10 text-critical" : "bg-surface-muted text-positive-text"
                  }`}
                >
                  {glance.text}
                </span>
              )}
              {!feature.href && (
                <span className="mt-3 inline-block rounded-full border border-border px-2 py-0.5 text-xs text-ink-muted">
                  Coming soon
                </span>
              )}
            </>
          );

          return (
            <li key={feature.name}>
              {feature.href ? (
                <Link
                  href={feature.href}
                  className="block rounded-xl border border-border bg-surface p-5 hover:border-primary"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-5 opacity-70">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

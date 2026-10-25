import Link from "next/link";
import { getAllPeriods, getPeriodData, getRunningPeriods } from "@/lib/data";
import { getAllTripSummaries } from "@/lib/data/waypoint";
import { getRecipesGlance } from "@/lib/data/recipes";
import { computeMonthStats } from "@/lib/monthStats";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";
import { getTimeZone, dayKeyIn } from "@/lib/today";
import { getFactOfTheDay } from "@/lib/funFacts";
import { BudgetIcon, RecipesIcon, WaypointIcon } from "@/components/home/FeatureIcons";
import { SheepMark } from "@/components/icons/SheepMark";

type BudgetGlance = {
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
};

/** Today's allowance and the period's progress, from the period running today. */
async function budgetGlance(todayKey: string): Promise<BudgetGlance | null> {
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

type WaypointGlance = { totalKm: number; trips: number; latest: string | null };

async function waypointGlance(): Promise<WaypointGlance> {
  const trips = await getAllTripSummaries(); // newest first
  return {
    totalKm: trips.reduce((sum, t) => sum + (t.total_km ?? 0), 0),
    trips: trips.length,
    latest: trips[0]?.title ?? null,
  };
}

function greeting(tz: string): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(new Date()));
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const kmFormatter = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 0 });

export default async function HomePage() {
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const [budget, waypoint, recipes] = await Promise.all([budgetGlance(todayKey), waypointGlance(), getRecipesGlance()]);
  const fact = getFactOfTheDay(todayKey);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${todayKey}T00:00:00Z`));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-ink-muted">{dateLabel}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{greeting(tz)}</h1>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <li>
          <div className="relative h-full min-h-48 overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
            <SheepMark className="pointer-events-none absolute -right-3 -bottom-3 h-24 w-24 opacity-15" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Fact of the day</h2>
              {fact.theme !== "Sheep" && (
                <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-medium">
                  {fact.theme}
                </span>
              )}
            </div>
            <p className="relative mt-4 text-lg leading-snug">{fact.text}</p>
          </div>
        </li>

        <li>
          <FeatureTile href="/budget" name="Budget" icon={BudgetIcon}>
            {budget ? (
              <>
                <p className={`font-mono text-3xl font-semibold tabular-nums ${budget.over ? "text-critical" : "text-foreground"}`}>
                  {budget.amount}
                </p>
                <p className={`text-sm ${budget.over ? "text-critical" : "text-positive-text"}`}>{budget.label}</p>
                <BudgetBar glance={budget} />
              </>
            ) : (
              <p className="text-sm text-ink-muted">No period running today</p>
            )}
          </FeatureTile>
        </li>

        <li>
          <FeatureTile href="/waypoint" name="Waypoint" icon={WaypointIcon}>
            <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
              {kmFormatter.format(waypoint.totalKm)} <span className="text-lg text-ink-muted">km</span>
            </p>
            <p className="text-sm text-ink-muted">
              {waypoint.trips} {waypoint.trips === 1 ? "trip" : "trips"}
            </p>
            {waypoint.latest && (
              <p className="mt-4 truncate text-sm text-foreground">
                <span className="text-ink-muted">Latest · </span>
                {waypoint.latest}
              </p>
            )}
          </FeatureTile>
        </li>

        <li>
          <FeatureTile href="/recipes" name="Recipes" icon={RecipesIcon}>
            <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
              {recipes.toMake} <span className="text-lg text-ink-muted">to make</span>
            </p>
            <p className="text-sm text-ink-muted">{recipes.toMake === 0 ? "Start swiping" : "Saved from the deck"}</p>
            {recipes.lastMade && (
              <p className="mt-4 truncate text-sm text-foreground">
                <span className="text-ink-muted">Last made · </span>
                {recipes.lastMade}
              </p>
            )}
          </FeatureTile>
        </li>

        <li>
          <div
            className="flex h-full min-h-20 items-center justify-center rounded-2xl border border-dashed border-border p-5 text-sm text-ink-muted"
            aria-label="More features coming soon"
          >
            More coming soon
          </div>
        </li>
      </ul>
    </div>
  );
}

function FeatureTile({
  href,
  name,
  icon: Icon,
  children,
}: {
  href: string;
  name: string;
  icon: (props: { className?: string }) => React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="tap group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 hover:border-primary"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="flex-1 text-xl font-semibold text-foreground">{name}</h2>
        <span aria-hidden="true" className="text-xl text-ink-muted transition-transform group-hover:translate-x-0.5">
          ›
        </span>
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </Link>
  );
}

/** Spent vs budget, with a tick where spending would be if it followed the calendar. */
function BudgetBar({ glance }: { glance: BudgetGlance }) {
  const spentShare = glance.budget > 0 ? Math.min(1, glance.spent / glance.budget) : 0;
  const ahead = glance.spent > glance.budget * glance.timeProgress;
  return (
    <div className="mt-auto pt-4">
      <div className="relative h-2 rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full ${glance.spent > glance.budget ? "bg-critical" : ahead ? "bg-tag-yellow" : "bg-good"}`}
          style={{ width: `${spentShare * 100}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/60"
          style={{ left: `calc(${glance.timeProgress * 100}% - 1px)` }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-ink-muted">
        <span>
          {formatCurrencyShort(glance.spent)} / {formatCurrencyShort(glance.budget)}
        </span>
        <span>
          {glance.daysLeft} {glance.daysLeft === 1 ? "day" : "days"} left
        </span>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { getAllTripSummaries } from "@/lib/data/waypoint";
import { getRecipesGlance } from "@/lib/data/recipes";
import { getLessonsGlance, type LessonsGlance } from "@/lib/data/lessons";
import { getRemindersGlance } from "@/lib/data/reminders";
import { budgetGlance, type BudgetGlance } from "@/lib/data/budgetGlance";
import { getDueSubscriptions } from "@/lib/data/subscriptions";
import { describeDue } from "@/lib/reminders/schedule";
import { describeSince } from "@/lib/reminders/routines";
import { formatCurrencyShort, formatHours } from "@/lib/format";
import { getTimeZone, dayKeyIn } from "@/lib/today";
import { getFactOfTheDay } from "@/lib/funFacts";
import { BeerIcon, BudgetIcon, LessonsIcon, PeopleIcon, RecipesIcon, RemindersIcon, WaypointIcon } from "@/components/home/FeatureIcons";
import { getBeerGlance } from "@/lib/data/beer";
import { getPeopleGlance } from "@/lib/data/people";
import { describeCountdown, SOON_DAYS } from "@/lib/people/birthdays";
import { SheepMark } from "@/components/icons/SheepMark";
import { RunningTimerBadge } from "@/components/lessons/RunningTimerBadge";
import { HomeWeather } from "@/components/home/HomeWeather";
import { logout } from "@/lib/actions/auth";
import { authDisabled } from "@/lib/authToken";

type WaypointGlance = { totalKm: number; trips: number; latest: string | null };

async function waypointGlance(): Promise<WaypointGlance> {
  const trips = await getAllTripSummaries(); // newest first
  return {
    totalKm: trips.reduce((sum, t) => sum + (t.total_km ?? 0), 0),
    trips: trips.length,
    latest: trips[0]?.title ?? null,
  };
}

function hourIn(tz: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(new Date()));
}

function greeting(tz: string): string {
  const hour = hourIn(tz);
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const kmFormatter = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 0 });

export default async function HomePage() {
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const fact = getFactOfTheDay(todayKey, hourIn(tz) >= 12);
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
        <HomeWeather />
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <li>
          <div className="relative h-full min-h-40 overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
            <SheepMark className="pointer-events-none absolute -right-3 -bottom-3 h-24 w-24 opacity-15" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Fact of the day</h2>
              {fact.theme !== "Sheep" && fact.theme !== "Cats" && (
                <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-medium">
                  {fact.theme}
                </span>
              )}
            </div>
            <p className="relative mt-2 text-base leading-snug">{fact.text}</p>
          </div>
        </li>

        <li>
          <FeatureTile href="/budget" name="Budget" icon={BudgetIcon}>
            <Suspense fallback={<TileSkeleton />}>
              <BudgetTileBody todayKey={todayKey} />
            </Suspense>
          </FeatureTile>
        </li>

        <li>
          <FeatureTile href="/lessons" name="Lessons" icon={LessonsIcon}>
            <Suspense fallback={<TileSkeleton />}>
              <LessonsTileBody todayKey={todayKey} />
            </Suspense>
          </FeatureTile>
        </li>

        <li>
          <FeatureTile href="/reminders" name="Reminders" icon={RemindersIcon}>
            <Suspense fallback={<TileSkeleton />}>
              <RemindersTileBody todayKey={todayKey} />
            </Suspense>
          </FeatureTile>
        </li>

        <li>
          <FeatureTile href="/people" name="People" icon={PeopleIcon}>
            <Suspense fallback={<TileSkeleton />}>
              <PeopleTileBody todayKey={todayKey} />
            </Suspense>
          </FeatureTile>
        </li>

        <li>
          <FeatureTile href="/beer" name="Beer" icon={BeerIcon}>
            <Suspense fallback={<TileSkeleton />}>
              <BeerTileBody todayKey={todayKey} />
            </Suspense>
          </FeatureTile>
        </li>

        <li>
          <FeatureTile href="/waypoint" name="Waypoint" icon={WaypointIcon}>
            <Suspense fallback={<TileSkeleton />}>
              <WaypointTileBody />
            </Suspense>
          </FeatureTile>
        </li>

        <li>
          <FeatureTile href="/recipes" name="Recipes" icon={RecipesIcon}>
            <Suspense fallback={<TileSkeleton />}>
              <RecipesTileBody />
            </Suspense>
          </FeatureTile>
        </li>
      </ul>

      <div className="flex justify-center gap-2">
        <Link href="/settings" className="btn btn-ghost inline-flex min-h-11 px-5 text-sm">
          Settings
        </Link>
        {!authDisabled() && (
          <form action={logout}>
            <button type="submit" className="btn btn-ghost inline-flex min-h-11 px-5 text-sm">
              Log out
            </button>
          </form>
        )}
      </div>
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

/** This week's hours, one small bar per day, scaled to the daily goal. */
function LessonsWeek({ glance }: { glance: LessonsGlance }) {
  const top = Math.max(glance.goalHours, ...glance.week.map((d) => d.hours));
  return (
    <div className="mt-auto pt-4">
      <div className="flex h-8 items-end gap-1">
        {glance.week.map((d) => (
          <div key={d.label} className="flex h-full flex-1 items-end rounded-sm bg-surface-muted">
            <div
              className={`w-full rounded-sm ${d.hours >= glance.goalHours ? "bg-good" : "bg-accent"}`}
              style={{ height: `${(d.hours / top) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-ink-muted">
        <span>This week</span>
        <span>{formatHours(glance.weekHours)}</span>
      </div>
    </div>
  );
}

function TileSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-2">
      <div className="h-9 w-32 rounded-lg bg-surface-muted" />
      <div className="h-4 w-24 rounded bg-surface-muted" />
    </div>
  );
}

async function BudgetTileBody({ todayKey }: { todayKey: string }) {
  const [budget, due] = await Promise.all([budgetGlance(todayKey), getDueSubscriptions(todayKey)]);
  if (!budget) return <p className="text-sm text-ink-muted">No period running today</p>;
  return (
    <>
      <p className={`font-mono text-3xl font-semibold tabular-nums ${budget.over ? "text-critical" : "text-foreground"}`}>
        {budget.amount}
      </p>
      <p className={`text-sm ${budget.over ? "text-critical" : "text-positive-text"}`}>
        {budget.label}
        {due.length > 0 && <span className="text-ink-muted"> · {due.length} subscription{due.length === 1 ? "" : "s"} to log</span>}
      </p>
      <BudgetBar glance={budget} />
    </>
  );
}

async function LessonsTileBody({ todayKey }: { todayKey: string }) {
  const lessons = await getLessonsGlance(todayKey);
  if (!lessons) return <p className="text-sm text-ink-muted">No study period yet</p>;
  return (
    <>
      <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
        {formatHours(lessons.todayHours).replace(" h", "")} <span className="text-lg text-ink-muted">h today</span>
      </p>
      <p className="text-sm text-ink-muted">
        {lessons.status}
        {lessons.nextExam &&
          ` · ${lessons.nextExam.label} ${lessons.nextExam.daysUntil === 0 ? "today" : `in ${lessons.nextExam.daysUntil}d`}`}
      </p>
      {lessons.timer && <RunningTimerBadge timer={lessons.timer} />}
      <LessonsWeek glance={lessons} />
    </>
  );
}

async function RemindersTileBody({ todayKey }: { todayKey: string }) {
  const reminders = await getRemindersGlance(todayKey);
  return (
    <>
      <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
        {reminders.open} <span className="text-lg text-ink-muted">open</span>
      </p>
      {reminders.overdue > 0 ? (
        <p className="text-sm text-critical">{reminders.overdue} overdue</p>
      ) : reminders.open === 0 ? (
        <p className="text-sm text-positive-text">All done</p>
      ) : (
        <p className="text-sm text-ink-muted">Nothing overdue</p>
      )}
      {reminders.next ? (
        <p className="mt-4 truncate text-sm text-foreground">
          <span className="text-ink-muted">Next · </span>
          {reminders.next.title}
          <span className="text-ink-muted"> · {describeDue(reminders.next.dueOn, todayKey)}</span>
        </p>
      ) : (
        reminders.longest && (
          <p className="mt-4 truncate text-sm text-foreground">
            <span className="text-ink-muted">Longest · </span>
            {reminders.longest.name}
            <span className="text-ink-muted"> · {describeSince(reminders.longest.lastDoneOn, todayKey).toLowerCase()}</span>
          </p>
        )
      )}
    </>
  );
}

async function WaypointTileBody() {
  const waypoint = await waypointGlance();
  return (
    <>
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
    </>
  );
}

async function RecipesTileBody() {
  const recipes = await getRecipesGlance();
  return (
    <>
      <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
        {recipes.cookbook} <span className="text-lg text-ink-muted">{recipes.cookbook === 1 ? "recipe" : "recipes"}</span>
      </p>
      <p className="text-sm text-ink-muted">
        {recipes.cookbook === 0 ? "Add your own" : "In your cookbook"}
        {recipes.toMake > 0 && ` · ${recipes.toMake} saved to make`}
      </p>
      {recipes.lastMade && (
        <p className="mt-4 truncate text-sm text-foreground">
          <span className="text-ink-muted">Last made · </span>
          {recipes.lastMade}
        </p>
      )}
    </>
  );
}

async function PeopleTileBody({ todayKey }: { todayKey: string }) {
  const { total, nextBirthday, soon, catchUp } = await getPeopleGlance(todayKey);
  if (total === 0) return <p className="text-sm text-ink-muted">Birthdays, notes and gift ideas</p>;
  const next = nextBirthday?.next;
  return (
    <>
      <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
        {total} <span className="text-lg text-ink-muted">{total === 1 ? "person" : "people"}</span>
      </p>
      {catchUp.length > 0 ? (
        <p className="truncate text-sm text-critical">
          Catch up with {catchUp.length === 1 ? catchUp[0].name : `${catchUp.length} people`}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          {soon} {soon === 1 ? "birthday" : "birthdays"} in the next {SOON_DAYS} days
        </p>
      )}
      {nextBirthday && next && (
        <p className="mt-4 truncate text-sm text-foreground">
          <span className="text-ink-muted">Next birthday · </span>
          {next.daysUntil === 0 ? "🎂 " : ""}
          {nextBirthday.name}
          <span className="text-ink-muted">
            {" · "}
            {next.daysUntil < 14
              ? describeCountdown(next.daysUntil, next.nextOn).toLowerCase()
              : describeCountdown(next.daysUntil, next.nextOn)}
            {next.turning !== null && ` · turns ${next.turning}`}
          </span>
        </p>
      )}
    </>
  );
}

async function BeerTileBody({ todayKey }: { todayKey: string }) {
  const beer = await getBeerGlance(todayKey);
  return (
    <>
      <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
        {beer.pints} <span className="text-lg text-ink-muted">{beer.pints === 1 ? "pint" : "pints"}</span>
      </p>
      <p className="text-sm text-ink-muted">This month</p>
      {beer.lastVisit && (
        <p className="mt-4 truncate text-sm text-foreground">
          <span className="text-ink-muted">Last beer · </span>
          {beer.lastPub ? (
            <>
              {beer.lastPub}
              <span className="text-ink-muted"> · {describeSince(beer.lastVisit, todayKey).toLowerCase()}</span>
            </>
          ) : (
            describeSince(beer.lastVisit, todayKey)
          )}
        </p>
      )}
    </>
  );
}

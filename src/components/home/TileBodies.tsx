import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { getWaypointGlance } from "@/lib/data/waypoint";
import { getWorkoutsGlance } from "@/lib/data/workouts";
import { workoutHeadline } from "@/lib/workouts/describe";
import { WeekDots } from "@/components/workouts/ui";
import { ElapsedClock } from "@/components/workouts/ElapsedClock";
import { formatKm, formatMinutes } from "@/lib/workouts/types";
import { getSectionMood, type SectionKind } from "@/lib/data/homeMoods";
import { LiveMascot } from "@/components/home/LiveMascot";
import { getRecipesGlance } from "@/lib/data/recipes";
import { getLessonsGlance, type LessonsGlance } from "@/lib/data/lessons";
import { getRemindersGlance } from "@/lib/data/reminders";
import { budgetGlance, type BudgetGlance } from "@/lib/data/budgetGlance";
import { getDueSubscriptions } from "@/lib/data/subscriptions";
import { describeDue } from "@/lib/reminders/schedule";
import { describeSince } from "@/lib/reminders/routines";
import { formatCurrencyShort, formatHours } from "@/lib/format";
import { getDiaryGlance, memoryHeadline } from "@/lib/data/diary";
import { describeYearsAgo, diaryBits, moodOf } from "@/lib/diary/onThisDay";
import { getBeerGlance } from "@/lib/data/beer";
import { getPeopleGlance } from "@/lib/data/people";
import { getWardrobeGlance } from "@/lib/data/wardrobe";
import { describeCountdown, SOON_DAYS } from "@/lib/people/birthdays";
import { RunningTimerBadge } from "@/components/lessons/RunningTimerBadge";
import { getBeerWeek, getDiaryWeek, weekOf } from "@/lib/data/homeWeek";
import { mascotName } from "@/lib/mascots";
import { THEME } from "@/lib/theme";

/*
 * The Home tiles: each section's card body (async server components reading
 * that section's glance) and the list of sections in Home order. Shared by the
 * Home page and the layout preview on /preview.
 */

export function hourIn(tz: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: tz,
    }).format(new Date()),
  );
}

export function greeting(tz: string): string {
  const hour = hourIn(tz);
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const kmFormatter = new Intl.NumberFormat("nl-BE", {
  maximumFractionDigits: 0,
});

/** The tile's mascot in today's mood; until that's known it rests (same look as /mascots' default). */
async function TileMascot({ kind, todayKey, hour, delay }: { kind: SectionKind; todayKey: string; hour: number; delay: number }) {
  const name = mascotName(kind, THEME);
  const m = await getSectionMood(kind, todayKey, hour).catch(() => null);
  return <LiveMascot kind={kind} name={name} mood={m?.mood} line={m?.line ?? `${name} says hi.`} delay={delay} size={42} badge />;
}

/**
 * One Home tile: a frosted card with the section's stock photo faint behind it.
 * The whole card opens the section through a link stretched over it; the content
 * sits above that link but lets taps fall through to it, except the mascot, which is
 * its own button (a tap makes it react instead of navigating).
 * `wide` spans both columns (Budget, the diary) and puts the title beside the mascot.
 */
export function FeatureTile({
  href,
  name,
  kind,
  todayKey,
  hour,
  index = 0,
  wide = false,
  photo,
  children,
}: {
  href: string;
  name: string;
  kind: SectionKind;
  todayKey: string;
  hour: number;
  /** Position on Home, to keep the mascots out of step. */
  index?: number;
  wide?: boolean;
  /** The section's stock photo (src/lib/homePhotos.ts). */
  photo?: string;
  children: React.ReactNode;
}) {
  const mascot = mascotName(kind, THEME);
  const delay = index * 0.9;
  const title = (
    <div className="min-w-0">
      <h2 className="truncate text-[17px] leading-tight font-semibold text-foreground">{name}</h2>
      <p className="truncate text-[13px] text-ink-muted">{mascot}</p>
    </div>
  );
  return (
    <div className="glass-card group @container relative flex h-full min-h-[176px] flex-col overflow-hidden p-4 transition-transform active:scale-[0.99]">
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local stock photo, decorative */}
          <img
            src={photo}
            alt=""
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover saturate-[0.85]"
            style={{ opacity: "var(--photo-opacity)" }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--background) 92%, transparent) 75%)",
            }}
          />
        </>
      )}
      <Link
        href={href}
        aria-label={name}
        className="absolute inset-0 rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <div className="pointer-events-none relative flex flex-1 flex-col">
        <div className={`flex gap-3 ${wide ? "items-center" : "items-start"}`}>
          <span className="pointer-events-auto">
            <Suspense fallback={<LiveMascot kind={kind} name={mascot} line={`${mascot} says hi.`} delay={delay} size={42} badge />}>
              <TileMascot kind={kind} todayKey={todayKey} hour={hour} delay={delay} />
            </Suspense>
          </span>
          {wide && title}
          <span aria-hidden="true" className="ml-auto text-xl leading-none text-ink-muted transition-transform group-hover:translate-x-0.5">
            ›
          </span>
        </div>
        {!wide && <div className="mt-2">{title}</div>}
        <div className="mt-4 flex flex-1 flex-col">{children}</div>
      </div>
    </div>
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
          className={`h-full rounded-full ${glance.spent > glance.budget ? "bg-critical" : ahead ? "bg-warning" : "bg-good"}`}
          style={{ width: `${spentShare * 100}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-1 h-4 w-0.5 rounded-full bg-foreground/60"
          style={{ left: `calc(${glance.timeProgress * 100}% - 1px)` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums text-ink-muted">
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
      <div className="mt-2 flex justify-between text-xs tabular-nums text-ink-muted">
        <span>This week</span>
        <span>{formatHours(glance.weekHours)}</span>
      </div>
    </div>
  );
}

/** Seven small bars, Mon → Sun this week (days still to come stay empty), with a caption. */
function WeekBars({ values, todayKey, left, right }: { values: number[]; todayKey: string; left: string; right: string }) {
  const days = weekOf(todayKey);
  const top = Math.max(1, ...values);
  return (
    <div className="mt-auto pt-4">
      <div aria-hidden="true" className="flex h-8 items-end gap-1">
        {values.map((v, i) => (
          <div key={days[i].key} className={`flex h-full flex-1 items-end rounded-sm bg-surface-muted ${days[i].future ? "opacity-50" : ""}`}>
            <div className="w-full rounded-sm bg-accent" style={{ height: `${(v / top) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums text-ink-muted">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

export function TileSkeleton() {
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
      <p
        className={`text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums ${budget.over ? "text-critical" : "text-foreground"}`}
      >
        {budget.amount}
      </p>
      <p className={`text-sm ${budget.over ? "text-critical" : "text-positive-text"}`}>
        {budget.label}
        {due.length > 0 && (
          <span className="text-ink-muted">
            {" "}
            · {due.length} subscription{due.length === 1 ? "" : "s"} to log
          </span>
        )}
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
      <p className="text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums text-foreground">
        {formatHours(lessons.todayHours).replace(" h", "")}{" "}
        <span className="text-[15px] font-medium tracking-normal text-ink-muted">h today</span>
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

async function WorkoutsTileBody({ todayKey }: { todayKey: string }) {
  const { week, streak, weekTotals, last, live } = await getWorkoutsGlance(todayKey);
  if (!last && !live) return <p className="text-sm text-ink-muted">Runs, sports and home workouts</p>;
  // Without a goal: what this week added up to (nothing while it's empty).
  const weekSum =
    weekTotals.sessions > 0
      ? [formatMinutes(weekTotals.minutes), weekTotals.km > 0 ? formatKm(weekTotals.km) : null].filter(Boolean).join(" · ")
      : null;
  const status = live ? (
    <span className="font-medium text-primary">
      Training now · {live.activityName} ·{" "}
      <span className="font-mono tabular-nums">
        <ElapsedClock since={live.startedAt} />
      </span>
    </span>
  ) : week.met ? (
    "Goal met"
  ) : week.goal !== null ? (
    `${week.left} to go`
  ) : (
    weekSum
  );
  return (
    <>
      <p className="text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums text-foreground">
        {week.done}
        {week.goal !== null && <span className="text-[15px] font-medium tracking-normal text-ink-muted"> / {week.goal}</span>}
        <span className="text-[15px] font-medium tracking-normal text-ink-muted"> this week</span>
      </p>
      {(status || streak > 0) && (
        <p className={`text-sm ${week.met && !live ? "text-positive-text" : "text-ink-muted"}`}>
          {status}
          {streak > 0 && (
            <span className="text-ink-muted">
              {status ? " · " : ""}🔥 {streak} {streak === 1 ? "week" : "weeks"}
            </span>
          )}
        </p>
      )}
      {last && (
        <p className="mt-3 truncate border-t border-border pt-2.5 text-[13px] text-foreground">
          <span className="text-ink-muted">Last · </span>
          {workoutHeadline(last)}
          <span className="text-ink-muted"> · {describeSince(last.date, todayKey).toLowerCase()}</span>
        </p>
      )}
      <div className="mt-auto pt-4">
        <WeekDots week={week} todayKey={todayKey} size="h-6 w-6" />
      </div>
    </>
  );
}

async function RemindersTileBody({ todayKey }: { todayKey: string }) {
  const reminders = await getRemindersGlance(todayKey);
  return (
    <>
      <p className="text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums text-foreground">
        {reminders.open} <span className="text-[15px] font-medium tracking-normal text-ink-muted">open</span>
      </p>
      {reminders.overdue > 0 ? (
        <p className="text-sm text-critical">{reminders.overdue} overdue</p>
      ) : reminders.open === 0 ? (
        <p className="text-sm text-positive-text">All done</p>
      ) : (
        <p className="text-sm text-ink-muted">Nothing overdue</p>
      )}
      {reminders.next ? (
        <p className="mt-3 truncate border-t border-border pt-2.5 text-[13px] text-foreground">
          <span className="text-ink-muted">Next · </span>
          {reminders.next.title}
          <span className="text-ink-muted"> · {describeDue(reminders.next.dueOn, todayKey)}</span>
        </p>
      ) : (
        reminders.longest && (
          <p className="mt-3 truncate border-t border-border pt-2.5 text-[13px] text-foreground">
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
  const waypoint = await getWaypointGlance();
  return (
    <>
      <p className="text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums text-foreground">
        {kmFormatter.format(waypoint.totalKm)} <span className="text-[15px] font-medium tracking-normal text-ink-muted">km</span>
      </p>
      <p className="text-sm text-ink-muted">
        {waypoint.trips} {waypoint.van ? "van " : ""}
        {waypoint.trips === 1 ? "trip" : "trips"}
      </p>
      {waypoint.latest && (
        <p className="mt-3 truncate border-t border-border pt-2.5 text-[13px] text-foreground">
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
      <p className="text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums text-foreground">
        {recipes.cookbook}{" "}
        <span className="text-[15px] font-medium tracking-normal text-ink-muted">{recipes.cookbook === 1 ? "recipe" : "recipes"}</span>
      </p>
      <p className="text-sm text-ink-muted">
        {recipes.cookbook === 0 ? "Add your own" : "In your cookbook"}
        {recipes.toMake > 0 && ` · ${recipes.toMake} saved to make`}
      </p>
      {recipes.lastMade && (
        <p className="mt-3 truncate border-t border-border pt-2.5 text-[13px] text-foreground">
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
      <p className="text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums text-foreground">
        {total} <span className="text-[15px] font-medium tracking-normal text-ink-muted">{total === 1 ? "person" : "people"}</span>
      </p>
      {catchUp.length > 0 ? (
        <p className="truncate text-sm text-warning-text">
          Catch up with {catchUp.length === 1 ? catchUp[0].name : `${catchUp.length} people`}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          {soon} {soon === 1 ? "birthday" : "birthdays"} in the next {SOON_DAYS} days
        </p>
      )}
      {nextBirthday && next && (
        <p className="mt-3 truncate border-t border-border pt-2.5 text-[13px] text-foreground">
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
  const [beer, week] = await Promise.all([getBeerGlance(todayKey), getBeerWeek(todayKey)]);
  const weekPints = week.reduce((a, b) => a + b, 0);
  return (
    <>
      <p className="text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums text-foreground">
        {beer.pints} <span className="text-[15px] font-medium tracking-normal text-ink-muted">{beer.pints === 1 ? "pint" : "pints"}</span>
      </p>
      <p className="text-sm text-ink-muted">This month</p>
      {beer.lastVisit && (
        <p className="mt-3 truncate border-t border-border pt-2.5 text-[13px] text-foreground">
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
      <WeekBars values={week} todayKey={todayKey} left="This week" right={`${weekPints} ${weekPints === 1 ? "pint" : "pints"}`} />
    </>
  );
}

async function DiaryTileBody({ todayKey }: { todayKey: string }) {
  const [{ today, memory }, week] = await Promise.all([getDiaryGlance(todayKey), getDiaryWeek(todayKey)]);
  const days = weekOf(todayKey);
  const mood = moodOf(today?.mood);
  const headline = memory && memoryHeadline(memory);
  return (
    <>
      {today ? (
        <p className="line-clamp-3 font-[family-name:var(--font-fraunces)] text-lg leading-snug text-foreground">
          {mood && <span className="mr-1.5">{mood.face}</span>}
          {diaryBits(today.text).at(-1)}
        </p>
      ) : (
        <>
          <p className="font-[family-name:var(--font-fraunces)] text-xl leading-snug text-foreground">Add to today</p>
          <p className="text-sm text-ink-muted">A few words, any time of day</p>
        </>
      )}
      {memory && headline && (
        <p className="mt-3 truncate border-t border-border pt-2.5 text-[13px] text-foreground">
          <span className="text-ink-muted">{describeYearsAgo(memory.yearsAgo)} · </span>
          {headline}
        </p>
      )}
      {/* this week: each written day's mood (a dot when no mood was picked), empty circles for the rest */}
      <div className="mt-auto flex justify-between gap-1 pt-4" aria-label={`Written on ${week.filter((m) => m !== null).length} of 7 days this week`}>
        {days.map((d, i) => {
          const m = week[i];
          return (
            <span key={d.key} className="flex flex-col items-center gap-1 text-[11px] text-ink-muted">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-base ${
                  m === null ? `border border-border ${d.future ? "opacity-50" : ""}` : "bg-surface-muted"
                }`}
              >
                {m ? moodOf(m)?.face : m === 0 ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
              </span>
              {d.label}
            </span>
          );
        })}
      </div>
    </>
  );
}

async function WardrobeTileBody() {
  const wardrobe = await getWardrobeGlance();
  if (wardrobe.items === 0) return <p className="text-sm text-ink-muted">Clothes, outfits and the wash</p>;
  return (
    <>
      <p className="text-[clamp(22px,18cqw,34px)] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums text-foreground">
        {wardrobe.wash} <span className="text-[15px] font-medium tracking-normal text-ink-muted">in the wash</span>
      </p>
      <p className="text-sm text-ink-muted">
        {wardrobe.drying > 0 && `${wardrobe.drying} drying · `}
        {wardrobe.items} {wardrobe.items === 1 ? "item" : "items"} · {wardrobe.outfits} {wardrobe.outfits === 1 ? "outfit" : "outfits"}
      </p>
    </>
  );
}

export type HomeSection = {
  kind: SectionKind;
  name: string;
  href: string;
  /** The card body for today. */
  render: (todayKey: string) => ReactNode;
};

/** Every section, in Home order. */
export const HOME_SECTIONS: HomeSection[] = [
  {
    kind: "budget",
    name: "Budget",
    href: "/budget",
    render: (t) => <BudgetTileBody todayKey={t} />,
  },
  {
    kind: "lessons",
    name: "Lessons",
    href: "/lessons",
    render: (t) => <LessonsTileBody todayKey={t} />,
  },
  {
    kind: "reminders",
    name: "Reminders",
    href: "/reminders",
    render: (t) => <RemindersTileBody todayKey={t} />,
  },
  {
    kind: "diary",
    name: "Diary",
    href: "/diary",
    render: (t) => <DiaryTileBody todayKey={t} />,
  },
  {
    kind: "beer",
    name: "Beer",
    href: "/beer",
    render: (t) => <BeerTileBody todayKey={t} />,
  },
  {
    kind: "workouts",
    name: "Workouts",
    href: "/workouts",
    render: (t) => <WorkoutsTileBody todayKey={t} />,
  },
  {
    kind: "wardrobe",
    name: "Wardrobe",
    href: "/wardrobe/items",
    render: () => <WardrobeTileBody />,
  },
  {
    kind: "people",
    name: "People",
    href: "/people",
    render: (t) => <PeopleTileBody todayKey={t} />,
  },
  {
    kind: "waypoint",
    name: "Waypoint",
    href: "/waypoint",
    render: () => <WaypointTileBody />,
  },
  {
    kind: "recipes",
    name: "Recipes",
    href: "/recipes",
    render: () => <RecipesTileBody />,
  },
];

/** The quick column's entries: each section's mascot by name (Penny, Hops…), opening its page. */
export function railSections() {
  return HOME_SECTIONS.map((s) => ({
    kind: s.kind,
    name: mascotName(s.kind, THEME),
    section: s.name,
    href: s.href,
  }));
}

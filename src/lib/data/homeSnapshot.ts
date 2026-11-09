import "server-only";
import { budgetGlance } from "@/lib/data/budgetGlance";
import { getDueSubscriptions } from "@/lib/data/subscriptions";
import { getLessonsGlance } from "@/lib/data/lessons";
import { getWorkoutsGlance } from "@/lib/data/workouts";
import { getRemindersGlance } from "@/lib/data/reminders";
import { getDiaryGlance, memoryHeadline } from "@/lib/data/diary";
import { getBeerGlance } from "@/lib/data/beer";
import { getPeopleGlance } from "@/lib/data/people";
import { getWardrobeGlance } from "@/lib/data/wardrobe";
import { getWaypointGlance } from "@/lib/data/waypoint";
import { getRecipesGlance } from "@/lib/data/recipes";
import type { SectionKind } from "@/lib/data/homeMoods";
import { describeDue } from "@/lib/reminders/schedule";
import { describeSince } from "@/lib/reminders/routines";
import { describeCountdown, SOON_DAYS } from "@/lib/people/birthdays";
import { describeYearsAgo, diaryBits, moodOf } from "@/lib/diary/onThisDay";
import { workoutHeadline } from "@/lib/workouts/describe";
import { formatCurrencyShort, formatHours } from "@/lib/format";
import { getFactOfTheDay, type FunFact } from "@/lib/funFacts";
import { greeting, hourIn } from "@/components/home/TileBodies";
import { heroPhoto, sectionPhoto, slotOf, type DaySlot } from "@/lib/homePhotos";

/*
 * Every Home section boiled down to the same few fields, for the layout mockups on
 * /preview?look=… (each look arranges them its own way). The text follows the Home
 * tiles in src/components/home/TileBodies.tsx so the numbers match.
 */

export type Tone = "good" | "bad" | "neutral";

export type SectionSummary = {
  kind: SectionKind;
  name: string;
  href: string;
  /** The headline number or phrase: "€ 23,65", "3", "Add to today". */
  value: string;
  /** Next to the value: "open", "h today", "pints". */
  unit?: string;
  /** One short status line: "left today", "2 overdue". */
  sub?: string;
  /** A longer line: "Next · Dentist · tomorrow". */
  detail?: string;
  tone: Tone;
  /** 0–1 where a bar makes sense. */
  progress?: number;
  /** Where the bar "should" be (budget: share of the period passed). */
  marker?: number;
  /** Small per-day bars (study hours, workout sessions), Mon→. */
  spark?: number[];
  /** A stock photo to show faintly behind the tile (public/photos/), if there is one. */
  backdrop?: string;
};

export type { DaySlot } from "@/lib/homePhotos";

export type HomeSnapshot = {
  dateLabel: string;
  greeting: string;
  fact: FunFact;
  sections: SectionSummary[];
  slot: DaySlot;
  /** A hero photo dropped in public/hero/ (`<theme>-<slot>.jpg`, else `<theme>.jpg`), if there is one. */
  hero: string | null;
};

const km = new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 0 });
const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/** `slotOverride` lets /preview show the hero for another time of day. */
export async function getHomeSnapshot(todayKey: string, tz: string, slotOverride?: DaySlot): Promise<HomeSnapshot> {
  const [budget, due, lessons, workouts, reminders, diary, beer, people, wardrobe, waypoint, recipes] = await Promise.all([
    budgetGlance(todayKey),
    getDueSubscriptions(todayKey),
    getLessonsGlance(todayKey),
    getWorkoutsGlance(todayKey),
    getRemindersGlance(todayKey),
    getDiaryGlance(todayKey),
    getBeerGlance(todayKey),
    getPeopleGlance(todayKey),
    getWardrobeGlance(),
    getWaypointGlance(),
    getRecipesGlance(),
  ]);

  const sections: SectionSummary[] = [];

  sections.push(
    budget
      ? {
          kind: "budget",
          name: "Budget",
          href: "/budget",
          value: budget.amount,
          sub: budget.label,
          detail: `${formatCurrencyShort(budget.spent)} / ${formatCurrencyShort(budget.budget)} · ${budget.daysLeft} ${plural(budget.daysLeft, "day")} left${
            due.length > 0 ? ` · ${due.length} ${plural(due.length, "subscription")} to log` : ""
          }`,
          tone: budget.over ? "bad" : "good",
          progress: budget.budget > 0 ? Math.min(1, budget.spent / budget.budget) : 0,
          marker: budget.timeProgress,
        }
      : { kind: "budget", name: "Budget", href: "/budget", value: "—", sub: "No period running today", tone: "neutral" },
  );

  sections.push(
    lessons
      ? {
          kind: "lessons",
          name: "Lessons",
          href: "/lessons",
          value: formatHours(lessons.todayHours).replace(" h", ""),
          unit: "h today",
          sub: lessons.status,
          detail: [
            `${formatHours(lessons.weekHours)} this week`,
            lessons.nextExam && `${lessons.nextExam.label} ${lessons.nextExam.daysUntil === 0 ? "today" : `in ${lessons.nextExam.daysUntil}d`}`,
          ]
            .filter(Boolean)
            .join(" · "),
          tone: "neutral",
          progress: lessons.goalHours > 0 ? Math.min(1, lessons.todayHours / lessons.goalHours) : undefined,
          spark: lessons.week.map((d) => d.hours),
        }
      : { kind: "lessons", name: "Lessons", href: "/lessons", value: "—", sub: "No study period yet", tone: "neutral" },
  );

  {
    const { week, streak, last, live } = workouts;
    sections.push({
      kind: "workouts",
      name: "Workouts",
      href: "/workouts",
      value: week.goal !== null ? `${week.done}/${week.goal}` : String(week.done),
      unit: "this week",
      sub: live
        ? `Training now · ${live.activityName}`
        : week.met
          ? "Goal met"
          : week.goal !== null
            ? `${week.left} to go`
            : undefined,
      detail: [last && `Last · ${workoutHeadline(last)}`, streak > 0 && `🔥 ${streak} ${plural(streak, "week")}`].filter(Boolean).join(" · ") || undefined,
      tone: week.met ? "good" : week.behind ? "bad" : "neutral",
      progress: week.goal ? Math.min(1, week.done / week.goal) : undefined,
      spark: week.days.map((d) => d.count),
    });
  }

  sections.push({
    kind: "reminders",
    name: "Reminders",
    href: "/reminders",
    value: String(reminders.open),
    unit: "open",
    sub: reminders.overdue > 0 ? `${reminders.overdue} overdue` : reminders.open === 0 ? "All done" : "Nothing overdue",
    detail: reminders.next
      ? `Next · ${reminders.next.title} · ${describeDue(reminders.next.dueOn, todayKey)}`
      : reminders.longest
        ? `Longest · ${reminders.longest.name} · ${describeSince(reminders.longest.lastDoneOn, todayKey).toLowerCase()}`
        : undefined,
    tone: reminders.overdue > 0 ? "bad" : reminders.open === 0 ? "good" : "neutral",
  });

  {
    const { today, memory } = diary;
    const mood = moodOf(today?.mood);
    const headline = memory && memoryHeadline(memory);
    sections.push({
      kind: "diary",
      name: "Diary",
      href: "/diary",
      value: today ? `${mood ? `${mood.face} ` : ""}${diaryBits(today.text).at(-1) ?? ""}` : "Add to today",
      sub: today ? undefined : "A few words, any time of day",
      detail: memory && headline ? `${describeYearsAgo(memory.yearsAgo)} · ${headline}` : undefined,
      tone: "neutral",
    });
  }

  sections.push({
    kind: "beer",
    name: "Beer",
    href: "/beer",
    value: String(beer.pints),
    unit: plural(beer.pints, "pint"),
    sub: "This month",
    detail: beer.lastVisit
      ? `Last beer · ${beer.lastPub ? `${beer.lastPub} · ` : ""}${describeSince(beer.lastVisit, todayKey).toLowerCase()}`
      : undefined,
    tone: "neutral",
  });

  {
    const { total, nextBirthday, soon, catchUp } = people;
    const next = nextBirthday?.next;
    sections.push({
      kind: "people",
      name: "People",
      href: "/people",
      value: String(total),
      unit: plural(total, "person", "people"),
      sub:
        catchUp.length > 0
          ? `Catch up with ${catchUp.length === 1 ? catchUp[0].name : `${catchUp.length} people`}`
          : `${soon} ${plural(soon, "birthday")} in the next ${SOON_DAYS} days`,
      detail:
        nextBirthday && next
          ? `${next.daysUntil === 0 ? "🎂 " : ""}${nextBirthday.name} · ${describeCountdown(next.daysUntil, next.nextOn).toLowerCase()}${
              next.turning !== null ? ` · turns ${next.turning}` : ""
            }`
          : undefined,
      tone: catchUp.length > 0 ? "bad" : "neutral",
    });
  }

  sections.push({
    kind: "wardrobe",
    name: "Wardrobe",
    href: "/wardrobe/items",
    value: String(wardrobe.wash),
    unit: "in the wash",
    sub: wardrobe.items === 0 ? "Clothes, outfits and the wash" : `${wardrobe.drying > 0 ? `${wardrobe.drying} drying · ` : ""}${wardrobe.items} items`,
    detail: wardrobe.items > 0 ? `${wardrobe.outfits} ${plural(wardrobe.outfits, "outfit")}` : undefined,
    tone: "neutral",
  });

  sections.push({
    kind: "waypoint",
    name: "Waypoint",
    href: "/waypoint",
    value: km.format(waypoint.totalKm),
    unit: "km",
    sub: `${waypoint.trips} ${waypoint.van ? "van " : ""}${plural(waypoint.trips, "trip")}`,
    detail: waypoint.latest ? `Latest · ${waypoint.latest}` : undefined,
    tone: "neutral",
  });

  sections.push({
    kind: "recipes",
    name: "Recipes",
    href: "/recipes",
    value: String(recipes.cookbook),
    unit: plural(recipes.cookbook, "recipe"),
    sub: recipes.toMake > 0 ? `${recipes.toMake} saved to make` : "In your cookbook",
    detail: recipes.lastMade ? `Last made · ${recipes.lastMade}` : undefined,
    tone: "neutral",
  });

  const dateLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${todayKey}T00:00:00Z`),
  );
  for (const section of sections) section.backdrop = sectionPhoto(section.kind);
  const slot = slotOverride ?? slotOf(hourIn(tz));
  return { dateLabel, greeting: greeting(tz), fact: getFactOfTheDay(todayKey, hourIn(tz) >= 12), sections, slot, hero: heroPhoto(slot, todayKey)?.src ?? null };
}

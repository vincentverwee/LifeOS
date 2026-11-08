// Pure: which mood a section's mascot is in, from what was logged, plus the one line it says when tapped.
import type { Mood } from "@/components/icons/mascotMoods";
import { formatCurrencyShort } from "@/lib/format";
import { daysSince } from "@/lib/reminders/routines";

/** What each section's mood looks at; the Home tiles fill these from their glances. */
export type MoodInput =
  | { kind: "budget"; budget: { over: boolean; spent: number; budget: number; timeProgress: number } | null }
  | {
      kind: "lessons";
      lessons: { todayHours: number; goalHours: number; examInDays: number | null; timerRunning: boolean } | null;
    }
  | { kind: "reminders"; open: number; overdue: number }
  | { kind: "diary"; wroteToday: boolean }
  | { kind: "beer"; lastVisit: string | null }
  | { kind: "wardrobe"; items: number; wash: number; lastWash: { coloured: string | null; white: string | null } }
  | { kind: "people"; total: number; birthdayToday: string | null; catchUp: number }
  | { kind: "waypoint"; latest: string | null }
  | { kind: "recipes"; lastMade: string | null }
  | {
      kind: "workouts";
      live: boolean;
      todayDone: boolean;
      /** null = no weekly goal. */
      goal: number | null;
      done: number;
      left: number;
      daysLeft: number;
      behind: boolean;
      /** This week's goal can't be made any more (one session a day). */
      missed: boolean;
      lastOn: string | null;
    };

export type MascotMood = { mood: Mood; line: string };

/** Under this share of the calendar's pace the budget mascot is happy. */
export const BUDGET_HAPPY_SHARE = 0.8;
/** Days without a beer before Hops gets sleepy ("thirsty"). */
export const BEER_THIRSTY_DAYS = 14;
/** Pieces in the wash basket before the wardrobe mascot worries. */
export const WASH_WORRY = 8;
/** Days since a load (white or coloured) was last washed before the wardrobe mascot worries. */
export const WASH_OVERDUE_DAYS = 10;
/** Days without a workout before the coach dozes off. */
export const WORKOUT_SLEEPY_DAYS = 7;
/** Before this hour (and from midnight) everyone not worried is asleep. */
export const NIGHT_UNTIL_HOUR = 6;

function sectionMood(input: MoodInput, name: string, todayKey: string): MascotMood {
  switch (input.kind) {
    case "budget": {
      const b = input.budget;
      if (!b) return { mood: "default", line: `${name} is waiting for a budget period.` };
      if (b.over) return { mood: "worried", line: `${name} is sweating: over budget.` };
      const plan = b.budget * b.timeProgress;
      if (b.spent > plan) return { mood: "worried", line: `${name} is sweating: ${formatCurrencyShort(b.spent - plan)} ahead of plan.` };
      if (b.spent <= plan * BUDGET_HAPPY_SHARE)
        return { mood: "happy", line: `${name} is delighted: ${formatCurrencyShort(plan - b.spent)} under plan.` };
      return { mood: "default", line: `${name} says you're right on track.` };
    }
    case "lessons": {
      const l = input.lessons;
      if (!l) return { mood: "default", line: `${name} is waiting for a new semester.` };
      if (l.timerRunning) return { mood: "default", line: `${name} is concentrating with you.` };
      if (l.goalHours > 0 && l.todayHours >= l.goalHours) return { mood: "happy", line: `${name} is proud: today's goal is done.` };
      if (l.examInDays !== null && l.examInDays <= 3)
        return {
          mood: "default",
          line: l.examInDays === 0 ? `${name} wishes you luck today!` : `${name} is cramming: exam in ${l.examInDays}d.`,
        };
      if (l.todayHours === 0) return { mood: "sleepy", line: `${name} dozes off until you study.` };
      return { mood: "default", line: `${name} is keeping count.` };
    }
    case "reminders":
      if (input.overdue > 0) return { mood: "worried", line: `${name} is fretting: ${input.overdue} overdue.` };
      if (input.open === 0) return { mood: "happy", line: `${name} is happy: nothing left to do.` };
      return { mood: "default", line: `${name} has ${input.open} on the list.` };
    case "diary":
      return input.wroteToday
        ? { mood: "happy", line: `${name} loved today's page.` }
        : { mood: "default", line: `${name} is waiting for today's page.` };
    case "beer": {
      if (input.lastVisit === todayKey) return { mood: "happy", line: `${name} says cheers!` };
      const days = daysSince(input.lastVisit, todayKey);
      if (days === null || days >= BEER_THIRSTY_DAYS) return { mood: "sleepy", line: `${name} is dozing off. Pub?` };
      return { mood: "default", line: `${name} is polishing glasses.` };
    }
    case "wardrobe":
      if (input.items === 0) return { mood: "default", line: `${name} is waiting for your first clothes.` };
      // A load that was never washed in the app has nothing to count from, so it doesn't worry.
      for (const [load, label] of [["white", "white"], ["coloured", "coloured"]] as const) {
        const days = daysSince(input.lastWash[load], todayKey);
        if (days !== null && days >= WASH_OVERDUE_DAYS)
          return { mood: "worried", line: `${name} is worried: no ${label} wash in ${days} days.` };
      }
      if (input.wash >= WASH_WORRY) return { mood: "worried", line: `${name} is worried: the basket is overflowing.` };
      if (input.wash === 0) return { mood: "happy", line: `${name} is happy: everything's clean.` };
      return { mood: "default", line: `${name} counts ${input.wash} in the wash.` };
    case "people":
      if (input.birthdayToday) return { mood: "happy", line: `${name} says: it's ${input.birthdayToday}'s birthday!` };
      if (input.catchUp > 0)
        return { mood: "worried", line: `${name} misses ${input.catchUp === 1 ? "someone" : `${input.catchUp} people`}.` };
      return { mood: "default", line: input.total === 0 ? `${name} would love to meet people.` : `${name} says hi to everyone.` };
    case "waypoint":
      return { mood: "default", line: input.latest ? `${name} is still thinking about ${input.latest}.` : `${name} is ready for a road trip.` };
    case "recipes":
      return { mood: "default", line: input.lastMade ? `${name} remembers ${input.lastMade}.` : `${name} is hungry.` };
    case "workouts": {
      if (input.live) return { mood: "happy", line: `${name} is cheering you on!` };
      if (input.goal !== null && input.left === 0 && input.done > 0)
        return { mood: "happy", line: `${name} is proud: ${input.done} of ${input.goal} this week.` };
      if (input.todayDone) return { mood: "happy", line: `${name} says: great session today!` };
      if (input.behind)
        return {
          mood: "worried",
          line: `${name} is pacing: ${input.left} to go, ${input.daysLeft} ${input.daysLeft === 1 ? "day" : "days"} left.`,
        };
      const days = daysSince(input.lastOn, todayKey);
      if (days === null) return { mood: "default", line: `${name} is ready when you are.` };
      if (days >= WORKOUT_SLEEPY_DAYS) return { mood: "sleepy", line: `${name} dozed off. ${days} days since the last one.` };
      if (input.missed) return { mood: "default", line: `${name} is already planning next week.` };
      return {
        mood: "default",
        line: input.goal !== null ? `${name} says: ${input.left} more this week.` : `${name} is stretching.`,
      };
    }
  }
}

/** The mood and tap line for one section's mascot; at night anyone not worried sleeps. */
export function moodFor(input: MoodInput, name: string, todayKey: string, hour: number): MascotMood {
  const mood = sectionMood(input, name, todayKey);
  if (hour < NIGHT_UNTIL_HOUR && mood.mood !== "worried") return { mood: "sleepy", line: `${name} is asleep. Shh…` };
  return mood;
}

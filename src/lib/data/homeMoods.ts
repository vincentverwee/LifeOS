import "server-only";
import type { MascotKind } from "@/components/icons/Mascot";
import { budgetGlance } from "@/lib/data/budgetGlance";
import { getBeerGlance } from "@/lib/data/beer";
import { getDiaryGlance } from "@/lib/data/diary";
import { getLessonsGlance } from "@/lib/data/lessons";
import { getPeopleGlance } from "@/lib/data/people";
import { getRecipesGlance } from "@/lib/data/recipes";
import { getRemindersGlance } from "@/lib/data/reminders";
import { getLastWashByLoad, getWardrobeGlance } from "@/lib/data/wardrobe";
import { getWaypointGlance } from "@/lib/data/waypoint";
import { getWorkoutsGlance } from "@/lib/data/workouts";
import { mascotName } from "@/lib/mascots";
import { moodFor, type MascotMood, type MoodInput } from "@/lib/mascotMood";
import { THEME } from "@/lib/theme";

export type SectionKind = Exclude<MascotKind, "plain">;

/** A section's mood input, from the same (request-cached) glances its Home tile reads. */
async function moodInput(kind: SectionKind, todayKey: string): Promise<MoodInput> {
  switch (kind) {
    case "budget":
      return { kind, budget: await budgetGlance(todayKey) };
    case "lessons": {
      const l = await getLessonsGlance(todayKey);
      return {
        kind,
        lessons: l && {
          todayHours: l.todayHours,
          goalHours: l.goalHours,
          examInDays: l.nextExam?.daysUntil ?? null,
          timerRunning: l.timer !== null,
        },
      };
    }
    case "reminders": {
      const r = await getRemindersGlance(todayKey);
      return { kind, open: r.open, overdue: r.overdue };
    }
    case "diary":
      return { kind, wroteToday: (await getDiaryGlance(todayKey)).today !== null };
    case "beer":
      return { kind, lastVisit: (await getBeerGlance(todayKey)).lastVisit };
    case "wardrobe": {
      const [w, lastWash] = await Promise.all([getWardrobeGlance(), getLastWashByLoad()]);
      return { kind, items: w.items, wash: w.wash, lastWash };
    }
    case "people": {
      const p = await getPeopleGlance(todayKey);
      const birthday = p.nextBirthday?.next.daysUntil === 0 ? p.nextBirthday.name : null;
      return { kind, total: p.total, birthdayToday: birthday, catchUp: p.catchUp.length };
    }
    case "waypoint":
      return { kind, latest: (await getWaypointGlance()).latest };
    case "recipes":
      return { kind, lastMade: (await getRecipesGlance()).lastMade };
    case "workouts": {
      const g = await getWorkoutsGlance(todayKey);
      return {
        kind,
        live: g.live !== null,
        todayDone: g.week.todayDone,
        goal: g.week.goal,
        done: g.week.done,
        left: g.week.left,
        daysLeft: g.week.daysLeft,
        behind: g.week.behind && g.week.reachable,
        lastOn: g.lastOn,
      };
    }
  }
}

/** One section mascot's mood and tap line for today. */
export async function getSectionMood(kind: SectionKind, todayKey: string, hour: number): Promise<MascotMood> {
  return moodFor(await moodInput(kind, todayKey), mascotName(kind, THEME), todayKey, hour);
}

/** Every section's mood, for the quick column (shares the tiles' cached loads). A failing section keeps its resting face. */
export async function getHomeMoods(kinds: SectionKind[], todayKey: string, hour: number): Promise<Partial<Record<MascotKind, MascotMood>>> {
  const moods = await Promise.all(kinds.map((k) => getSectionMood(k, todayKey, hour).catch(() => null)));
  return Object.fromEntries(kinds.flatMap((k, i) => (moods[i] ? [[k, moods[i]]] : [])));
}

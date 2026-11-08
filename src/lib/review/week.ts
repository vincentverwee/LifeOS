import type { MascotAnimal, MascotKind } from "@/components/icons/mascotProps";
import { formatCurrency, formatHours, formatLiters, plural } from "@/lib/format";
import { mondayOf } from "@/lib/lessons/stats";
import { litersOf, pintsOf } from "@/lib/monthStats";
import { budgetOfDays, type BudgetRange } from "@/lib/push/window";
import { addDays, weekdayOf } from "@/lib/reminders/schedule";
import { diaryBits } from "@/lib/diary/onThisDay";
import { mascotName } from "@/lib/mascots";
import { WASH_ROUTINE_SOURCE } from "@/lib/wardrobe/types";

/*
 * The weekly review (/review): one Mon–Sun week told as tap-through cards, each
 * narrated by its section's mascot. Pure: src/lib/data/review.ts fetches the
 * rows, summarizeWeek() adds them up, buildStory() turns that into cards.
 */

export const WIN_MAX = 280;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LIST_MAX = 6;

/* ---------- which week ---------- */

/** On Sunday the week that's ending, any other day the last full one. */
export function defaultWeek(todayKey: string): string {
  const monday = mondayOf(todayKey);
  return weekdayOf(todayKey) === 0 ? monday : addDays(monday, -7);
}

/** A `?week=` value: a Monday no later than this week's. */
export function parseWeek(raw: unknown, todayKey: string): string | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  if (Number.isNaN(new Date(`${raw}T00:00:00Z`).getTime()) || weekdayOf(raw) !== 1) return null;
  return raw <= mondayOf(todayKey) ? raw : null;
}

/** The days of the week from `monday`, stopping at today for the running week. */
export function weekDays(monday: string, todayKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => d <= todayKey);
}

/* ---------- raw rows → week summary ---------- */

export type RawExpense = {
  date: string;
  amount: number;
  category: string;
  pintPrice: number | null;
  pints: number | null;
  sizeMl: number | null;
  pub: string | null;
};

export type RawStudyEntry = { date: string; hours: number; note: string | null };

export type WeekRaw = {
  monday: string;
  todayKey: string;
  expenses: RawExpense[];
  prevExpenses: RawExpense[];
  budgetRanges: BudgetRange[];
  studyPeriod: { startDate: string; endDate: string; goalHours: number } | null;
  studyEntries: RawStudyEntry[];
  prevStudyHours: number;
  diary: { date: string; text: string; mood: number | null }[];
  routineLogs: { name: string; source: string | null }[];
  remindersDone: string[];
  outfitWears: { name: string }[];
  itemWears: number;
  recipes: string[];
  trips: { title: string; start: string | null; end: string | null; stops: string[] }[];
  win: string | null;
};

export type StudyWeek = {
  hours: number;
  goalHours: number;
  goalDays: number;
  atGoal: number;
  daysOff: number;
  perDay: number[];
};

/**
 * Study over `days`: hours per day, and the daily goal for each day inside the
 * period that isn't a day off (a 0 h entry with a note). Shared with the Sunday push.
 */
export function studyWeek(
  days: string[],
  period: { startDate: string; endDate: string; goalHours: number },
  entries: RawStudyEntry[]
): StudyWeek {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.date, (totals.get(e.date) ?? 0) + e.hours);
  const off = new Set(entries.filter((e) => e.hours === 0 && e.note).map((e) => e.date));
  const goalDays = days.filter((d) => d >= period.startDate && d <= period.endDate && !off.has(d));
  const perDay = days.map((d) => round2(totals.get(d) ?? 0));
  return {
    hours: round2(perDay.reduce((a, b) => a + b, 0)),
    goalHours: period.goalHours,
    goalDays: goalDays.length,
    atGoal: goalDays.filter((d) => (totals.get(d) ?? 0) >= period.goalHours).length,
    daysOff: days.filter((d) => off.has(d)).length,
    perDay,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type WeekSummary = {
  monday: string;
  days: string[];
  money: {
    total: number;
    budget: number;
    prevTotal: number;
    perDay: number[];
    categories: { name: string; amount: number }[];
  };
  study: StudyWeek | null;
  prevStudyHours: number;
  beer: { pints: number; liters: number; pubs: string[]; prevPints: number };
  diary: { moods: (number | null)[]; written: number; bits: number; best: string | null };
  lastDone: { name: string; count: number }[];
  remindersDone: string[];
  wardrobe: { outfits: { name: string; count: number }[]; itemWears: number; washes: number };
  recipes: string[];
  trips: { title: string; days: number; stops: string[] }[];
  win: string | null;
};

function counted(names: string[]): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const n of names) map.set(n, (map.get(n) ?? 0) + 1);
  return [...map].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function beerOf(expenses: RawExpense[]) {
  let pints = 0;
  let liters = 0;
  for (const e of expenses) {
    const n = pintsOf(e);
    pints += n;
    liters += litersOf(n, e.sizeMl);
  }
  return { pints, liters };
}

const WASH_SOURCES = new Set(Object.values(WASH_ROUTINE_SOURCE));

export function summarizeWeek(raw: WeekRaw): WeekSummary {
  const days = weekDays(raw.monday, raw.todayKey);
  const inWeek = (d: string) => days.includes(d);
  const expenses = raw.expenses.filter((e) => inWeek(e.date));

  const categories = new Map<string, number>();
  for (const e of expenses) categories.set(e.category, (categories.get(e.category) ?? 0) + e.amount);

  const diary = raw.diary.filter((d) => inWeek(d.date));
  const best = [...diary]
    .filter((d) => diaryBits(d.text).length > 0)
    .sort((a, b) => (b.mood ?? 0) - (a.mood ?? 0) || b.date.localeCompare(a.date))[0];

  const beer = beerOf(expenses);
  return {
    monday: raw.monday,
    days,
    money: {
      total: round2(expenses.reduce((s, e) => s + e.amount, 0)),
      budget: round2(budgetOfDays(days, raw.budgetRanges)),
      prevTotal: round2(raw.prevExpenses.reduce((s, e) => s + e.amount, 0)),
      perDay: days.map((d) => round2(expenses.filter((e) => e.date === d).reduce((s, e) => s + e.amount, 0))),
      categories: [...categories]
        .map(([name, amount]) => ({ name, amount: round2(amount) }))
        .filter((c) => c.amount > 0)
        .sort((a, b) => b.amount - a.amount),
    },
    study: raw.studyPeriod ? studyWeek(days, raw.studyPeriod, raw.studyEntries.filter((e) => inWeek(e.date))) : null,
    prevStudyHours: round2(raw.prevStudyHours),
    beer: {
      pints: beer.pints,
      liters: beer.liters,
      pubs: [...new Set(expenses.filter((e) => e.pub && pintsOf(e) > 0).map((e) => e.pub as string))],
      prevPints: beerOf(raw.prevExpenses).pints,
    },
    diary: {
      moods: days.map((d) => diary.find((e) => e.date === d)?.mood ?? null),
      written: diary.length,
      bits: diary.reduce((s, d) => s + diaryBits(d.text).length, 0),
      best: best ? diaryBits(best.text).at(-1) ?? null : null,
    },
    lastDone: counted(raw.routineLogs.filter((l) => !l.source || !WASH_SOURCES.has(l.source)).map((l) => l.name)),
    remindersDone: raw.remindersDone,
    wardrobe: {
      outfits: counted(raw.outfitWears.map((w) => w.name)),
      itemWears: raw.itemWears,
      washes: raw.routineLogs.filter((l) => l.source && WASH_SOURCES.has(l.source)).length,
    },
    recipes: [...new Set(raw.recipes)],
    // A long stay (a whole Erasmus) shouldn't fill every week: only trips that
    // started or ended this week, or reached a new stop.
    trips: raw.trips
      .filter((t) => t.stops.length > 0 || (t.start && inWeek(t.start)) || (t.end && inWeek(t.end)))
      .map((t) => ({
        title: t.title,
        days: days.filter((d) => t.start && d >= t.start && d <= (t.end ?? t.start)).length,
        stops: t.stops,
      }))
      .filter((t) => t.days > 0),
    win: raw.win,
  };
}

/* ---------- summary → story cards ---------- */

export type StoryCard = {
  key: string;
  kind: MascotKind;
  /** The mascot's name, or null for the plain sheep/cat. */
  speaker: string | null;
  line: string;
  big: { value: string; label: string }[];
  list?: string[];
  quote?: string;
  /** Bars per day (Mon…), heights relative to the largest or the goal line. */
  bars?: { labels: string[]; values: number[]; goal?: number; format: "money" | "hours" };
  moods?: (number | null)[];
  /** The last card: the win of the week. */
  outro?: boolean;
};

/** Stable pick from `lines` for this week, so a reload says the same thing. */
function pick(lines: string[], seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return lines[h % lines.length];
}

function fill(line: string, values: Record<string, string>): string {
  return line.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
}

function versus(now: number, before: number, unit: (n: number) => string): string {
  if (before === 0 && now === 0) return "same as last week";
  const diff = round2(now - before);
  if (diff === 0) return "same as last week";
  return `${diff > 0 ? "+" : "−"}${unit(Math.abs(diff))} vs last week`;
}

const ITEM_MAX = 32;

/** At most LIST_MAX chips, each cut to ITEM_MAX characters. */
function shortList(items: string[]): string[] {
  const cut = items.map((i) => (i.length > ITEM_MAX ? `${i.slice(0, ITEM_MAX - 1).trimEnd()}…` : i));
  return cut.length > LIST_MAX ? [...cut.slice(0, LIST_MAX - 1), `+${cut.length - LIST_MAX + 1} more`] : cut;
}

const pints = (n: number) => plural(Math.round(n * 10) / 10, "pint", "pints");

export function buildStory(week: WeekSummary, animal: MascotAnimal): StoryCard[] {
  const seed = (key: string) => `${week.monday}:${key}`;
  const labels = week.days.map((d) => DAY_LABELS[(weekdayOf(d) + 6) % 7]);
  const cards: StoryCard[] = [];
  const say = (kind: Exclude<MascotKind, "plain">) => mascotName(kind, animal);

  // Money
  const m = week.money;
  if (m.total > 0 || m.budget > 0) {
    const over = m.budget > 0 && m.total > m.budget;
    const vars = { left: formatCurrency(m.budget - m.total), over: formatCurrency(m.total - m.budget) };
    const line =
      m.budget <= 0
        ? pick(["Here's where the money went.", "I counted every coin."], seed("money"))
        : over
          ? pick(
              ["{over} over the week's budget. Let's keep an eye on that.", "Hm. {over} more than planned this week.", "{over} over. Next week we tighten the purse."],
              seed("money")
            )
          : pick(["{left} to spare. I approve.", "Under budget, {left} left. Splendid.", "Nicely done: {left} left of the week's budget."], seed("money"));
    cards.push({
      key: "money",
      kind: "budget",
      speaker: say("budget"),
      line: fill(line, vars),
      big: [
        { value: formatCurrency(m.total), label: m.budget > 0 ? `of ${formatCurrency(m.budget)}` : "spent" },
        { value: versus(m.total, m.prevTotal, formatCurrency), label: "" },
      ],
      bars: { labels, values: m.perDay, format: "money" },
      list: m.categories.slice(0, 3).map((c) => `${c.name} · ${formatCurrency(c.amount)}`),
    });
  }

  // Study
  const s = week.study;
  if (s && (s.hours > 0 || s.goalDays > 0)) {
    const target = s.goalDays * s.goalHours;
    const share = target > 0 ? s.hours / target : 1;
    const line =
      share >= 1
        ? pick(["Top marks: the goal is met.", "Exemplary studying this week.", "Goal reached. I'm quite proud."], seed("study"))
        : share >= 0.6
          ? pick(["Solid work, nearly at the goal.", "A good week of studying. A little more next time?"], seed("study"))
          : pick(["A quieter week with the books.", "Let's open the books a bit more next week."], seed("study"));
    cards.push({
      key: "study",
      kind: "lessons",
      speaker: say("lessons"),
      line,
      big: [
        { value: formatHours(s.hours), label: target > 0 ? `of ${formatHours(target)}` : "studied" },
        ...(s.goalDays > 0 ? [{ value: `${s.atGoal} of ${s.goalDays}`, label: "days at the goal" }] : []),
        { value: versus(s.hours, week.prevStudyHours, formatHours), label: "" },
      ],
      bars: { labels, values: s.perDay, goal: s.goalHours, format: "hours" },
    });
  }

  // Beer
  const b = week.beer;
  if (b.pints > 0) {
    cards.push({
      key: "beer",
      kind: "beer",
      speaker: say("beer"),
      line: pick(
        b.pints >= 8
          ? ["Quite the week at the bar!", "Cheers to a busy week of pints."]
          : ["Cheers! A few good pints.", "A nice pint or two this week."],
        seed("beer")
      ),
      big: [
        { value: pints(b.pints), label: formatLiters(Math.round(b.liters * 10) / 10) },
        ...(b.pubs.length > 0 ? [{ value: plural(b.pubs.length, "pub", "pubs"), label: "visited" }] : []),
        { value: versus(b.pints, b.prevPints, (n) => pints(n)), label: "" },
      ],
      list: shortList(b.pubs),
    });
  }

  // Diary
  const d = week.diary;
  if (d.written > 0) {
    cards.push({
      key: "diary",
      kind: "diary",
      speaker: say("diary"),
      line: d.best ? pick(["My favourite bit this week:", "This one made me smile:"], seed("diary")) : "You kept the diary this week.",
      quote: d.best ?? undefined,
      big: [
        { value: `${d.written} of ${week.days.length}`, label: "days written" },
        { value: plural(d.bits, "bit", "bits"), label: "in all" },
      ],
      moods: d.moods.some((x) => x !== null) ? d.moods : undefined,
    });
  }

  // Last done + finished reminders
  const doneCount = week.lastDone.reduce((sum, r) => sum + r.count, 0);
  if (doneCount > 0 || week.remindersDone.length > 0) {
    cards.push({
      key: "done",
      kind: "reminders",
      speaker: say("reminders"),
      line: pick(["Tick, tick, tick. All done!", "Look at everything you got done.", "Nothing slipped by me this week."], seed("done")),
      big: [
        ...(doneCount > 0 ? [{ value: String(doneCount), label: doneCount === 1 ? "thing done" : "things done" }] : []),
        ...(week.remindersDone.length > 0
          ? [{ value: String(week.remindersDone.length), label: week.remindersDone.length === 1 ? "reminder ticked off" : "reminders ticked off" }]
          : []),
      ],
      list: shortList([...week.lastDone.map((r) => (r.count > 1 ? `${r.name} ×${r.count}` : r.name)), ...week.remindersDone]),
    });
  }

  // Wardrobe
  const w = week.wardrobe;
  const outfitWears = w.outfits.reduce((sum, o) => sum + o.count, 0);
  if (outfitWears > 0 || w.washes > 0 || w.itemWears > 0) {
    cards.push({
      key: "wardrobe",
      kind: "wardrobe",
      speaker: say("wardrobe"),
      line: pick(["Looking sharp this week.", "Cosy and clean, just how I like it.", "What a well-dressed week."], seed("wardrobe")),
      big: [
        ...(outfitWears > 0 ? [{ value: plural(outfitWears, "outfit", "outfits"), label: "worn" }] : []),
        ...(w.washes > 0 ? [{ value: plural(w.washes, "load", "loads"), label: "washed" }] : []),
        ...(outfitWears === 0 && w.itemWears > 0 ? [{ value: plural(w.itemWears, "piece", "pieces"), label: "worn" }] : []),
      ],
      list: shortList(w.outfits.map((o) => (o.count > 1 ? `${o.name} ×${o.count}` : o.name))),
    });
  }

  // Recipes
  if (week.recipes.length > 0) {
    cards.push({
      key: "recipes",
      kind: "recipes",
      speaker: say("recipes"),
      line: pick(["Magnifique! You cooked this week.", "Something smelled delicious.", "Bon appétit!"], seed("recipes")),
      big: [{ value: plural(week.recipes.length, "recipe", "recipes"), label: "made" }],
      list: shortList(week.recipes),
    });
  }

  // Trips
  if (week.trips.length > 0) {
    const roadDays = Math.max(...week.trips.map((t) => t.days));
    cards.push({
      key: "trips",
      kind: "waypoint",
      speaker: say("waypoint"),
      line: pick(["Adventure! Where to next?", "On the road again.", "What a trip."], seed("trips")),
      big: [{ value: plural(roadDays, "day", "days"), label: "on the road" }],
      list: shortList(week.trips.flatMap((t) => [t.title, ...t.stops.map((s) => `· ${s}`)])),
    });
  }

  const intro: StoryCard = {
    key: "intro",
    kind: "plain",
    speaker: null,
    line: cards.length > 0 ? "Here's your week. Tap to go on." : "A quiet week: nothing logged.",
    big: [{ value: plural(cards.length, "part", "parts"), label: "to look back on" }],
  };
  const outro: StoryCard = {
    key: "outro",
    kind: "plain",
    speaker: null,
    line: "And the win of the week?",
    big: [],
    outro: true,
  };
  return [intro, ...cards, outro];
}

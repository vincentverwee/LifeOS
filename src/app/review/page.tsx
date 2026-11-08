import { WeekStory } from "@/components/review/WeekStory";
import { getWeekReview } from "@/lib/data/review";
import { mondayOf } from "@/lib/lessons/stats";
import { addDays } from "@/lib/reminders/schedule";
import { buildStory, defaultWeek, parseWeek } from "@/lib/review/week";
import { THEME } from "@/lib/theme";
import { getTimeZone, getTodayKey } from "@/lib/today";

export const metadata = { title: "Your week" };

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "3 – 9 Nov", or "27 Oct – 2 Nov" across months. */
function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const from = dayMonth.format(new Date(`${monday}T00:00:00Z`));
  const to = dayMonth.format(new Date(`${sunday}T00:00:00Z`));
  return monday.slice(5, 7) === sunday.slice(5, 7) ? `${from.split(" ")[0]} – ${to}` : `${from} – ${to}`;
}

/** The weekly review: last Mon–Sun (this week on Sundays), or `?week=<monday>`. */
export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  const [todayKey, tz, params] = await Promise.all([getTodayKey(), getTimeZone(), searchParams]);
  const week = parseWeek(params.week, todayKey) ?? defaultWeek(todayKey);
  const summary = await getWeekReview(week, todayKey, tz);
  const next = addDays(week, 7);

  return (
    <WeekStory
      key={week}
      cards={buildStory(summary, THEME)}
      week={week}
      label={weekLabel(week)}
      prevWeek={addDays(week, -7)}
      nextWeek={next <= mondayOf(todayKey) ? next : null}
      win={summary.win}
    />
  );
}

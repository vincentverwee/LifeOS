import Link from "next/link";
import { getDiaryEntry, getMoodStrip, getOnThisDay, getRecentDiary } from "@/lib/data/diary";
import { getTodayKey } from "@/lib/today";
import { parseDateKey } from "@/lib/format";
import { DiaryForm } from "@/components/diary/DiaryForm";
import { OnThisDay } from "@/components/diary/OnThisDay";
import { MoodStrip } from "@/components/diary/MoodStrip";
import { DiaryTimeline } from "@/components/diary/DiaryTimeline";

/** Lines per page of the timeline. */
const PAGE = 20;

export default async function DiaryPage({ searchParams }: PageProps<"/diary">) {
  const { before: rawBefore } = await searchParams;
  const before = parseDateKey(rawBefore) ?? undefined;
  const todayKey = await getTodayKey();
  const [entry, memories, moods, recent] = await Promise.all([
    getDiaryEntry(todayKey),
    getOnThisDay(todayKey),
    getMoodStrip(todayKey, 30),
    getRecentDiary(PAGE, before),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Home
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Diary</h1>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold text-foreground">Today</h2>
        <DiaryForm key={todayKey} date={todayKey} entry={entry} placeholder="One line about today…" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">On this day</h2>
        <OnThisDay memories={memories} emptyText="Nothing from earlier years yet. It fills up as the years go by." />
      </section>

      <MoodStrip days={moods} />

      {(recent.rows.length > 0 || before) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">{before ? "Older lines" : "Timeline"}</h2>
          {recent.rows.length > 0 ? (
            <DiaryTimeline rows={recent.rows} />
          ) : (
            <p className="text-sm text-ink-muted">Nothing older.</p>
          )}
          <div className="flex gap-2">
            {before && (
              <Link href="/diary" className="btn btn-ghost inline-flex min-h-11 px-4 text-sm">
                ‹ Newest
              </Link>
            )}
            {recent.more && (
              <Link href={`/diary?before=${recent.rows.at(-1)!.date}`} className="btn btn-outline inline-flex min-h-11 px-5 text-sm">
                Show older
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

import { loadStudyPeriods } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { lessonWeekCount, lessonWeekOf } from "@/lib/lessons/stats";
import { LessonGrid } from "@/components/lessons/LessonGrid";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

export default async function LessonGridPage({ searchParams }: PageProps<"/lessons/grid">) {
  const { period: requested } = await searchParams;
  const todayKey = await getTodayKey();
  const { periods, period } = await loadStudyPeriods(typeof requested === "string" ? requested : undefined, todayKey);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Lessons</h1>
          <p className="mt-1 text-sm text-ink-muted">Tap a cell: attended, done, still to do…</p>
        </div>
        {period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      </div>
      {period ? (
        <LessonGrid
          key={period.id}
          courses={period.courses}
          marks={period.marks}
          startDate={period.startDate}
          blokStart={period.blokStart}
          weekCount={lessonWeekCount(period)}
          currentWeek={lessonWeekOf(period, todayKey)}
        />
      ) : (
        <p className="text-sm text-ink-muted">No study period yet.</p>
      )}
    </div>
  );
}

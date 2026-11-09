import { PageHeader } from "@/components/ui/PageHeader";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lessons"
        subtitle="Tap a cell: attended, done, still to do…"
        back={{ href: typeof requested === "string" ? `/lessons?period=${encodeURIComponent(requested)}` : "/lessons", label: "Lessons" }}
        action={period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      />
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

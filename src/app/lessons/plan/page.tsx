import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStudyPlans, loadStudyPeriods } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { DaysLeft, PlanCalendar } from "@/components/lessons/PlanCalendar";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

export default async function LessonsPlanPage({ searchParams }: PageProps<"/lessons/plan">) {
  const { period: requested } = await searchParams;
  const todayKey = await getTodayKey();
  const { periods, period } = await loadStudyPeriods(typeof requested === "string" ? requested : undefined, todayKey);
  const plans = period ? await getStudyPlans(period.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        section="lessons"
        title="Plan"
        subtitle="Tap a day to plan what to study"
        action={period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      />
      {period ? (
        <>
          <DaysLeft todayKey={todayKey} courses={period.courses} exams={period.exams} plans={plans} />
          <PlanCalendar
            key={period.id}
            periodId={period.id}
            startDate={period.startDate}
            endDate={period.endDate}
            todayKey={todayKey}
            courses={period.courses}
            exams={period.exams}
            plans={plans}
          />
          {/* The grid has no phone tab; in exam season it's where "still to do" lessons are. */}
          <Link
            href={`/lessons/grid?period=${encodeURIComponent(period.id)}`}
            className="btn btn-ghost -mt-3 inline-flex min-h-11 self-start px-3 text-sm"
          >
            Lesson grid ›
          </Link>
        </>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          No study period yet.{" "}
          <Link href="/lessons/settings" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Create one in Settings
          </Link>
        </p>
      )}
    </div>
  );
}

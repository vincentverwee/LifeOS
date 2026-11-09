import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStudyTimer, loadStudyPeriods } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { LogTimePanel } from "@/components/lessons/LogTimePanel";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

export default async function AddStudyTimePage({ searchParams }: PageProps<"/lessons/add">) {
  const { period: requested } = await searchParams;
  const todayKey = await getTodayKey();
  const [{ periods, period }, timer] = await Promise.all([
    loadStudyPeriods(typeof requested === "string" ? requested : undefined, todayKey),
    getStudyTimer(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Log study time"
        subtitle={
          period && (
            <Link
              href={typeof requested === "string" ? `/lessons/log?period=${encodeURIComponent(requested)}` : "/lessons/log"}
              className="btn btn-ghost -ml-3 inline-flex min-h-11 px-3 text-sm"
            >
              Full log ›
            </Link>
          )
        }
        back={{ href: typeof requested === "string" ? `/lessons?period=${encodeURIComponent(requested)}` : "/lessons", label: "Lessons" }}
        action={period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      />
      {period ? (
        <LogTimePanel
          key={period.id}
          periodId={period.id}
          startDate={period.startDate}
          endDate={period.endDate}
          // Tracked courses (Ekonomika, Projectvak…) are logged here too; they just don't count as study.
          courses={[...period.courses, ...period.trackedCourses].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))}
          timer={timer}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          No study period yet.{" "}
          <Link href="/lessons/settings" className="text-primary">
            Create one in Settings
          </Link>
          .
        </p>
      )}
    </div>
  );
}

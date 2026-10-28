import Link from "next/link";
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Log study time</h1>
          {period && (
            <Link
              href={typeof requested === "string" ? `/lessons/log?period=${encodeURIComponent(requested)}` : "/lessons/log"}
              className="btn btn-ghost -ml-3 inline-flex min-h-11 px-3 text-sm"
            >
              Full log ›
            </Link>
          )}
        </div>
        {period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      </div>
      {period ? (
        <LogTimePanel
          key={period.id}
          periodId={period.id}
          startDate={period.startDate}
          endDate={period.endDate}
          courses={period.courses}
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

import Link from "next/link";
import { getStudyPeriods, resolveStudyPeriod } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { StudyEntryForm } from "@/components/lessons/StudyEntryForm";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

export default async function AddStudyTimePage({ searchParams }: PageProps<"/lessons/add">) {
  const { period: requested } = await searchParams;
  const periods = await getStudyPeriods();
  const period = resolveStudyPeriod(periods, typeof requested === "string" ? requested : undefined, await getTodayKey());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Log study time</h1>
        {period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      </div>
      {period ? (
        <StudyEntryForm
          key={period.id}
          periodId={period.id}
          startDate={period.startDate}
          endDate={period.endDate}
          courses={period.courses}
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

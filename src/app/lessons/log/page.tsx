import Link from "next/link";
import { getStudyPeriods, resolveStudyPeriod } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { formatHours } from "@/lib/format";
import { StudyEntryList } from "@/components/lessons/StudyEntryList";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

export default async function StudyLogPage({ searchParams }: PageProps<"/lessons/log">) {
  const { period: requested } = await searchParams;
  const periods = await getStudyPeriods();
  const period = resolveStudyPeriod(periods, typeof requested === "string" ? requested : undefined, await getTodayKey());
  const total = period ? Math.round(period.entries.reduce((s, e) => s + e.hours, 0) * 100) / 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Study log</h1>
          {period && <p className="mt-1 font-mono text-sm tabular-nums text-ink-muted">{formatHours(total)} in total</p>}
        </div>
        {period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      </div>
      {period ? (
        <StudyEntryList entries={period.entries} courses={period.courses} groupByDay />
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

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadStudyPeriods } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { formatHours } from "@/lib/format";
import { StudyEntryList } from "@/components/lessons/StudyEntryList";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

export default async function StudyLogPage({ searchParams }: PageProps<"/lessons/log">) {
  const { period: requested } = await searchParams;
  const todayKey = await getTodayKey();
  const { periods, period } = await loadStudyPeriods(typeof requested === "string" ? requested : undefined, todayKey);
  const total = period ? Math.round(period.entries.reduce((s, e) => s + e.hours, 0) * 100) / 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Study log"
        subtitle={period && <span className="font-mono tabular-nums">{formatHours(total)} in total</span>}
        back={{ href: typeof requested === "string" ? `/lessons?period=${encodeURIComponent(requested)}` : "/lessons", label: "Lessons" }}
        action={period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      />
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

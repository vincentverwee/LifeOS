import { getStudyPeriods, resolveStudyPeriod } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { CourseManager, DeletePeriodButton, ExamManager, StudyPeriodForm } from "@/components/lessons/StudySettings";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

export default async function LessonsSettingsPage({ searchParams }: PageProps<"/lessons/settings">) {
  const { period: requested } = await searchParams;
  const periods = await getStudyPeriods();
  const period = resolveStudyPeriod(periods, typeof requested === "string" ? requested : undefined, await getTodayKey());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-ink-muted">A period is one semester: lessons, blok, exams.</p>
        </div>
        {period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      </div>

      {period && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-medium text-foreground">{period.name}</h2>
            <div className="rounded-xl border border-border bg-surface p-4">
              <StudyPeriodForm key={period.id} period={period} />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="px-1">
              <h2 className="font-medium text-foreground">Courses</h2>
              <p className="text-sm text-ink-muted">The code is what you tap when logging time.</p>
            </div>
            <CourseManager key={period.id} period={period} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="px-1 font-medium text-foreground">Exams &amp; tests</h2>
            <ExamManager key={period.id} period={period} />
          </section>

          <DeletePeriodButton period={period} />
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 font-medium text-foreground">New period</h2>
        <div className="rounded-xl border border-border bg-surface p-4">
          <StudyPeriodForm />
        </div>
      </section>
    </div>
  );
}

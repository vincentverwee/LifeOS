import { PageHeader } from "@/components/ui/PageHeader";
import { loadStudyPeriods } from "@/lib/data/lessons";
import { getTodayKey } from "@/lib/today";
import { CourseManager, DeletePeriodButton, ExamManager, StudyPeriodForm } from "@/components/lessons/StudySettings";
import { StudyPeriodSwitcher } from "@/components/lessons/StudyPeriodSwitcher";

export default async function LessonsSettingsPage({ searchParams }: PageProps<"/lessons/settings">) {
  const { period: requested } = await searchParams;
  const todayKey = await getTodayKey();
  const { periods, period } = await loadStudyPeriods(typeof requested === "string" ? requested : undefined, todayKey);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        subtitle="A period is one semester: lessons, blok, exams."
        back={{ href: typeof requested === "string" ? `/lessons?period=${encodeURIComponent(requested)}` : "/lessons", label: "Lessons" }}
        action={period && <StudyPeriodSwitcher periods={periods} activeId={period.id} />}
      />

      {period && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">Exams, tests &amp; deadlines</h2>
            <ExamManager key={period.id} period={period} />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="section-title px-1">{period.name}</h2>
            <div className="card">
              <StudyPeriodForm key={period.id} period={period} />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="px-1">
              <h2 className="section-title">Courses</h2>
              <p className="text-sm text-ink-muted">The code is what you tap when logging time.</p>
            </div>
            <CourseManager key={period.id} period={period} />
          </section>

          <DeletePeriodButton period={period} />
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="section-title px-1">New period</h2>
        <div className="card">
          <StudyPeriodForm />
        </div>
      </section>
    </div>
  );
}

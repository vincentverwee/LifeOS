import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { notFound, redirect } from "next/navigation";
import { getDiaryEntry, getOnThisDay } from "@/lib/data/diary";
import { getTodayKey } from "@/lib/today";
import { parseDateKey } from "@/lib/format";
import { addDays } from "@/lib/reminders/schedule";
import { DiaryForm } from "@/components/diary/DiaryForm";
import { OnThisDay } from "@/components/diary/OnThisDay";

const longDate = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** One day: add to or fix it (back-dating), and what happened on it in earlier years. */
export default async function DiaryDayPage({ params }: PageProps<"/diary/[date]">) {
  const { date: raw } = await params;
  const date = parseDateKey(raw);
  if (!date) notFound();
  const todayKey = await getTodayKey();
  if (date > todayKey) notFound();
  if (date === todayKey) redirect("/diary");

  const [entry, memories] = await Promise.all([getDiaryEntry(date), getOnThisDay(date)]);
  const next = addDays(date, 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageHeader title={longDate.format(new Date(`${date}T00:00:00Z`))} back={{ href: "/diary", label: "Diary" }} />
        <div className="mt-2 flex justify-between">
          <Link href={`/diary/${addDays(date, -1)}`} className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
            ‹ Day before
          </Link>
          <Link href={next >= todayKey ? "/diary" : `/diary/${next}`} className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
            {next >= todayKey ? "Today ›" : "Day after ›"}
          </Link>
        </div>
      </div>

      <section className="card">
        <DiaryForm key={date} date={date} entry={entry} placeholder="Add something about that day…" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">This day in earlier years</h2>
        <OnThisDay memories={memories} emptyText="Nothing logged on this day in earlier years." />
      </section>
    </div>
  );
}

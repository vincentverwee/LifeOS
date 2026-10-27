import Link from "next/link";
import { notFound } from "next/navigation";
import { getReminder } from "@/lib/data/reminders";
import { getTodayKey } from "@/lib/today";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { DeleteReminderButton } from "@/components/reminders/DeleteReminderButton";

export default async function EditReminderPage({ params }: PageProps<"/reminders/[id]">) {
  const { id } = await params;
  const [reminder, todayKey] = await Promise.all([getReminder(id), getTodayKey()]);
  if (!reminder) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/reminders" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Reminders
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Edit reminder</h1>
      </div>

      <ReminderForm reminder={reminder} todayKey={todayKey} />

      <DeleteReminderButton id={reminder.id} title={reminder.title} />
    </div>
  );
}

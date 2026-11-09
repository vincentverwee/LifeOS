import { PageHeader } from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { getReminder } from "@/lib/data/reminders";
import { getTodayKey } from "@/lib/today";
import { ReminderForm } from "@/components/reminders/ReminderForm";
import { ConfirmDeleteButton } from "@/components/reminders/ConfirmDeleteButton";
import { deleteReminder } from "@/lib/actions/reminders";

export default async function EditReminderPage({ params }: PageProps<"/reminders/[id]">) {
  const { id } = await params;
  const [reminder, todayKey] = await Promise.all([getReminder(id), getTodayKey()]);
  if (!reminder) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit reminder" back={{ href: "/reminders", label: "Reminders" }} />

      <ReminderForm reminder={reminder} todayKey={todayKey} />

      <ConfirmDeleteButton action={deleteReminder} id={reminder.id} title={reminder.title} label="Delete reminder" />
    </div>
  );
}

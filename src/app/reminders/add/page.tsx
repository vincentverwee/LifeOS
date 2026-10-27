import { getTodayKey } from "@/lib/today";
import { ReminderForm } from "@/components/reminders/ReminderForm";

export default async function AddReminderPage() {
  const todayKey = await getTodayKey();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Add reminder</h1>
      <ReminderForm todayKey={todayKey} />
    </div>
  );
}

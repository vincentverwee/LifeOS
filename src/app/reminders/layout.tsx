import { RemindersNavigation } from "@/components/reminders/RemindersNavigation";
import { RemindersTabBar } from "@/components/reminders/RemindersTabBar";

export default function RemindersLayout({ children }: LayoutProps<"/reminders">) {
  return (
    <div className="pb-tabbar">
      <RemindersNavigation />
      {children}
      <RemindersTabBar />
    </div>
  );
}

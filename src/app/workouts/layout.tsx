import { WorkoutsNavigation } from "@/components/workouts/WorkoutsNavigation";
import { WorkoutsTabBar } from "@/components/workouts/WorkoutsTabBar";

export default function WorkoutsLayout({ children }: LayoutProps<"/workouts">) {
  return (
    <div className="pb-tabbar">
      <WorkoutsNavigation />
      {children}
      <WorkoutsTabBar />
    </div>
  );
}

import { LessonsNavigation } from "@/components/lessons/LessonsNavigation";
import { LessonsTabBar } from "@/components/lessons/LessonsTabBar";

export default function LessonsLayout({ children }: LayoutProps<"/lessons">) {
  return (
    <div className="pb-tabbar">
      <LessonsNavigation />
      {children}
      <LessonsTabBar />
    </div>
  );
}

import { WaypointNavigation } from "@/components/waypoint/layout/WaypointNavigation";
import { WaypointTabBar } from "@/components/waypoint/layout/WaypointTabBar";

// `data-waypoint` switches the page to Waypoint's own palette (see globals.css) and widens
// the root <main> so maps and the export layouts get room on desktop.
export default function WaypointLayout({ children }: LayoutProps<"/waypoint">) {
  return (
    <div data-waypoint className="pb-tabbar">
      <WaypointNavigation />
      {children}
      <WaypointTabBar />
    </div>
  );
}

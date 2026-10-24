import { WaypointNavigation } from "@/components/waypoint/layout/WaypointNavigation";
import { WaypointTabBar } from "@/components/waypoint/layout/WaypointTabBar";

// `data-waypoint` only widens the root <main> so maps and the export layouts get room on
// desktop. Colours and type come from the shared Meadow tokens, same as Budget.
export default function WaypointLayout({ children }: LayoutProps<"/waypoint">) {
  return (
    <div data-waypoint className="pb-tabbar">
      <WaypointNavigation />
      {children}
      <WaypointTabBar />
    </div>
  );
}

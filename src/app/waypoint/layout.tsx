import { WaypointNavigation } from "@/components/waypoint/layout/WaypointNavigation";
import { WaypointTabBar } from "@/components/waypoint/layout/WaypointTabBar";

// Pages read at the app's normal width like every other section; the few that need room on
// desktop (the full map, a trip's stops + route, the export screens) render `data-waypoint`
// themselves, which widens the root <main>. Colours and type are the shared Meadow tokens.
export default function WaypointLayout({ children }: LayoutProps<"/waypoint">) {
  return (
    <div className="pb-tabbar">
      <WaypointNavigation />
      {children}
      <WaypointTabBar />
    </div>
  );
}

import { HomeContent } from "@/components/home/HomeContent";
import { QuickRail } from "@/components/home/QuickRail";
import { railSections } from "@/components/home/TileBodies";
import { getHomeAlerts } from "@/lib/data/homeAlerts";
import { getTimeZone, dayKeyIn } from "@/lib/today";

export default async function HomePage() {
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  return (
    // Swipe left anywhere (or tap the right-edge tab) for a column of mascots that open their section.
    <QuickRail sections={railSections()} alerts={getHomeAlerts(todayKey)}>
      <HomeContent tz={tz} todayKey={todayKey} />
    </QuickRail>
  );
}

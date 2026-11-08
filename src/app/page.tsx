import { HomeContent } from "@/components/home/HomeContent";
import { getTimeZone, dayKeyIn } from "@/lib/today";

export default async function HomePage() {
  const tz = await getTimeZone();
  return <HomeContent tz={tz} todayKey={dayKeyIn(tz)} />;
}

import { BirthdayParty } from "@/components/home/BirthdayParty";
import { HomeContent } from "@/components/home/HomeContent";
import { QuickRail } from "@/components/home/QuickRail";
import { hourIn, railSections } from "@/components/home/TileBodies";
import { getHomeAlerts } from "@/lib/data/homeAlerts";
import { getHomeMoods } from "@/lib/data/homeMoods";
import { birthdayNote, isBirthday } from "@/lib/birthday";
import { THEME } from "@/lib/theme";
import { getTimeZone, dayKeyIn } from "@/lib/today";

export default async function HomePage() {
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const sections = railSections();
  return (
    <>
      {/* The cat deployment's birthday party (src/lib/birthday.ts); renders nothing on other days. */}
      {THEME === "cat" && <BirthdayParty todayKey={todayKey} note={isBirthday(todayKey) ? birthdayNote() : []} />}
      {/* Swipe left anywhere (or tap the right-edge tab) for a column of mascots that open their section. */}
      <QuickRail sections={sections} alerts={getHomeAlerts(todayKey)} moods={getHomeMoods(sections.map((s) => s.kind), todayKey, hourIn(tz))}>
        <HomeContent tz={tz} todayKey={todayKey} />
      </QuickRail>
    </>
  );
}

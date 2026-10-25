import { StudyPeriodSelect } from "@/components/lessons/StudyPeriodSelect";

/** Server wrapper: only id + name reach the client, not every period's entries. */
export function StudyPeriodSwitcher({ periods, activeId }: { periods: { id: string; name: string }[]; activeId: string }) {
  return <StudyPeriodSelect periods={periods.map(({ id, name }) => ({ id, name }))} activeId={activeId} />;
}

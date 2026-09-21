import type { Period, PeriodKey, PeriodType } from "@/lib/data/periods";

export function encodePeriodKey(period: Pick<Period, "type" | "id">): PeriodKey {
  return `${period.type}:${period.id}`;
}

export function decodePeriodKey(
  key: string
): { type: PeriodType; id: string } | null {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex === -1) return null;

  const type = key.slice(0, separatorIndex);
  const id = key.slice(separatorIndex + 1);
  if (type !== "cycle" && type !== "trip") return null;
  if (!id) return null;

  return { type, id };
}

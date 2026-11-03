const COMMON = ["black", "white", "grey", "navy", "blue", "beige", "brown", "green", "red"];

/** Colour suggestions: the ones already used (most used first), then common ones. */
export function usedColors(items: { color: string | null }[]): string[] {
  const counts = new Map<string, number>();
  for (const { color } of items) if (color) counts.set(color, (counts.get(color) ?? 0) + 1);
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const lower = new Set(used.map((c) => c.toLowerCase()));
  return [...used, ...COMMON.filter((c) => !lower.has(c))];
}

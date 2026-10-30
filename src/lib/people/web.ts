// A small force-directed layout for the "who knows who" web on /people. Pure and
// deterministic (seeded start positions), so the picture doesn't jump between visits.

export type WebNode = {
  id: string;
  name: string;
  group?: string | null;
  /** Family row relative to the pinned node (−1 = parents above, 1 = children below). */
  level?: number | null;
};
export type WebEdge = { a: string; b: string };
export type Placed = WebNode & { x: number; y: number };

const ITERATIONS = 300;
const SPRING_LENGTH = 90;
const SPRING = 0.04;
const REPULSION = 6000;
const GRAVITY = 0.02;
/** Height of one family row, and how hard family members are pulled onto theirs. */
const LEVEL_GAP = 110;
const LEVEL_PULL = 0.12;

/** A stable 0–1 number from an id, for the seeded start positions. */
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/**
 * Positions around (0, 0): linked people pull together, everyone pushes apart, a weak
 * pull keeps clusters close. `pin` (you) stays at the centre and family members with a
 * `level` are pulled onto their row above or below it.
 */
export function layoutWeb(nodes: WebNode[], edges: WebEdge[], pin?: string): Placed[] {
  const pos = nodes.map((n, i) => {
    if (n.id === pin) return { ...n, x: 0, y: 0 };
    const angle = hash01(n.id) * Math.PI * 2;
    const r = 40 + 20 * i;
    const y = pin && n.level != null ? n.level * LEVEL_GAP : Math.sin(angle) * r;
    return { ...n, x: Math.cos(angle) * r, y };
  });
  const index = new Map(pos.map((p, i) => [p.id, i]));
  const links = edges
    .map((e) => [index.get(e.a), index.get(e.b)] as const)
    .filter((l): l is readonly [number, number] => l[0] !== undefined && l[1] !== undefined);

  for (let step = 0; step < ITERATIONS; step++) {
    const cooling = 1 - step / ITERATIONS;
    const force = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;
        if (dx === 0 && dy === 0) dx = dy = 0.01 * (i + 1);
        const d2 = Math.max(dx * dx + dy * dy, 25);
        const d = Math.sqrt(d2);
        const f = REPULSION / d2;
        force[i].x += (dx / d) * f;
        force[i].y += (dy / d) * f;
        force[j].x -= (dx / d) * f;
        force[j].y -= (dy / d) * f;
      }
    }
    for (const [i, j] of links) {
      const dx = pos[j].x - pos[i].x;
      const dy = pos[j].y - pos[i].y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const f = SPRING * (d - SPRING_LENGTH);
      force[i].x += (dx / d) * f;
      force[i].y += (dy / d) * f;
      force[j].x -= (dx / d) * f;
      force[j].y -= (dy / d) * f;
    }
    for (let i = 0; i < pos.length; i++) {
      if (pos[i].id === pin) continue;
      force[i].x -= pos[i].x * GRAVITY;
      force[i].y -= pos[i].y * GRAVITY;
      const level = pos[i].level;
      if (pin && level != null) force[i].y += (level * LEVEL_GAP - pos[i].y) * LEVEL_PULL;
      // Cap each step so nothing flies off early on.
      const len = Math.sqrt(force[i].x ** 2 + force[i].y ** 2);
      const max = 20 * cooling + 0.5;
      const scale = len > max ? max / len : 1;
      pos[i].x += force[i].x * scale;
      pos[i].y += force[i].y * scale;
    }
  }
  return pos;
}

/** The box around all points, padded, for the SVG viewBox. */
export function bounds(points: { x: number; y: number }[], pad: number) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return { x: minX, y: minY, width: Math.max(...xs) + pad - minX, height: Math.max(...ys) + pad - minY };
}

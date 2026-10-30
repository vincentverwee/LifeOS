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
/** Different starts tried; the one with the fewest crossing lines wins. */
const STARTS = 8;
/** People not linked (even indirectly) to you are pulled in this much less, so they sit off to the side. */
const LOOSE_GRAVITY = 0.3;
/** A line passing closer than this to someone else's dot counts as running through it. */
const NODE_CLEARANCE = 14;

/** A stable 0–1 number from an id, for the seeded start positions. */
function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

type Point = { x: number; y: number };

/** Whether segments ab and cd properly cross (touching at an end doesn't count). */
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

/** Distance from p to the segment ab. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** How many pairs of lines cross (lines sharing a person never count). */
export function countCrossings(placed: (Point & { id: string })[], edges: WebEdge[]): number {
  const at = new Map(placed.map((p) => [p.id, p]));
  const lines = edges.flatMap((e) => {
    const a = at.get(e.a);
    const b = at.get(e.b);
    return a && b ? [{ e, a, b }] : [];
  });
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const [l, m] = [lines[i], lines[j]];
      if (l.e.a === m.e.a || l.e.a === m.e.b || l.e.b === m.e.a || l.e.b === m.e.b) continue;
      if (crosses(l.a, l.b, m.a, m.b)) count++;
    }
  }
  return count;
}

/** Lines that run through someone else's dot. */
function linesThroughDots(placed: Placed[], edges: WebEdge[]): number {
  const at = new Map(placed.map((p) => [p.id, p]));
  let count = 0;
  for (const e of edges) {
    const a = at.get(e.a);
    const b = at.get(e.b);
    if (!a || !b) continue;
    for (const p of placed) {
      if (p.id !== e.a && p.id !== e.b && distanceToSegment(p, a, b) < NODE_CLEARANCE) count++;
    }
  }
  return count;
}

/** Roughly where a name is drawn under its dot (13-unit text, as PeopleWeb draws it). */
function nameBox(p: Placed) {
  return { x: p.x, y: p.y + 20, w: p.name.length * 7.5 + 6, h: 16 };
}

/** Names that run into another name or dot. */
function crowdedNames(placed: Placed[]): number {
  let count = 0;
  for (const p of placed) {
    const a = nameBox(p);
    for (const q of placed) {
      if (q === p) continue;
      const shapes = [{ x: q.x, y: q.y, w: 20, h: 20 }, nameBox(q)];
      for (const b of shapes) {
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) count++;
      }
    }
  }
  return count;
}

/** Ids linked to `pin`, directly or through others. */
function reachable(pin: string | undefined, edges: WebEdge[]): Set<string> {
  const seen = new Set<string>(pin ? [pin] : []);
  for (let grew = true; grew; ) {
    grew = false;
    for (const e of edges) {
      if (seen.has(e.a) !== seen.has(e.b)) {
        seen.add(seen.has(e.a) ? e.b : e.a);
        grew = true;
      }
    }
  }
  return seen;
}

/**
 * Positions around (0, 0): linked people pull together, everyone pushes apart, a weak
 * pull keeps clusters close. `pin` (you) stays at the centre and family members with a
 * `level` are pulled onto their row above or below it. Runs from several starts and keeps
 * the picture with the fewest crossing lines (then the fewest lines through dots and names
 * bumping into others; ties keep
 * the earliest start, so an uncrossed web looks as before); rounded so the server and every
 * browser draw exactly the same thing.
 */
export function layoutWeb(nodes: WebNode[], edges: WebEdge[], pin?: string): Placed[] {
  const linked = reachable(pin, edges);
  let best: { placed: Placed[]; score: number } | null = null;
  for (let turn = 0; turn < STARTS; turn++) {
    const placed = settle(nodes, edges, pin, turn / STARTS, linked);
    const score = countCrossings(placed, edges) * 1000 + linesThroughDots(placed, edges) + crowdedNames(placed);
    if (!best || score < best.score) best = { placed, score };
    if (score === 0) break;
  }
  return (best?.placed ?? []).map((p) => ({ ...p, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }));
}

/** One force-directed run; `turn` (0–1) rotates everyone's seeded start angle. */
function settle(nodes: WebNode[], edges: WebEdge[], pin: string | undefined, turn: number, linked: Set<string>): Placed[] {
  const pos = nodes.map((n, i) => {
    if (n.id === pin) return { ...n, x: 0, y: 0 };
    const angle = (hash01(n.id) + turn) * Math.PI * 2;
    const r = 40 + 20 * i;
    const y = pin && n.level != null ? n.level * LEVEL_GAP : Math.sin(angle) * r;
    return { ...n, x: Math.cos(angle) * r, y };
  });
  const gravity = pos.map((p) => (!pin || linked.has(p.id) ? GRAVITY : GRAVITY * LOOSE_GRAVITY));
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
      force[i].x -= pos[i].x * gravity[i];
      force[i].y -= pos[i].y * gravity[i];
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

/** Where along a line its label may sit (0 = the end it's seen from), best first. */
const LABEL_SPOTS = [0.62, 0.5, 0.75, 0.4, 0.3, 0.85];

/** A rectangle by its centre: a name, a dot or a label. */
export type Box = Point & { w: number; h: number };

/** How far apart two boxes are (negative = overlapping). */
function gap(a: Box, b: Box): number {
  return Math.max(Math.abs(a.x - b.x) - (a.w + b.w) / 2, Math.abs(a.y - b.y) - (a.h + b.h) / 2);
}

/**
 * A label's centre on the line from → to: the first of LABEL_SPOTS where a `size` box
 * keeps `clearance` from the other lines and doesn't touch any name or dot (`boxes`), else
 * the spot with the most room.
 */
export function labelSpot(
  from: Point,
  to: Point,
  size: { w: number; h: number },
  otherLines: [Point, Point][],
  boxes: Box[],
  clearance: number
): Point {
  let best = { point: from, room: -Infinity };
  for (const t of LABEL_SPOTS) {
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    const label = { ...point, ...size };
    const room = Math.min(
      Infinity,
      ...otherLines.map(([a, b]) => distanceToSegment(point, a, b) - clearance),
      ...boxes.map((b) => gap(label, b))
    );
    if (room >= 0) return point;
    if (room > best.room) best = { point, room };
  }
  return best.point;
}

/** The box around all points, padded, for the SVG viewBox. */
export function bounds(points: { x: number; y: number }[], pad: number) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return { x: minX, y: minY, width: Math.max(...xs) + pad - minX, height: Math.max(...ys) + pad - minY };
}

import { describe, expect, it } from "vitest";
import { bounds, countCrossings, labelSpot, layoutWeb, type WebEdge, type WebNode } from "./web";

const nodes: WebNode[] = [
  { id: "me", name: "You", level: 0 },
  { id: "mum", name: "Anna", level: -1 },
  { id: "bro", name: "Tom", level: 0 },
  { id: "louise", name: "Louise" },
  { id: "kid", name: "Mia", level: 1 },
];
const edges: WebEdge[] = [
  { a: "me", b: "mum" },
  { a: "me", b: "bro" },
  { a: "me", b: "kid" },
  { a: "bro", b: "louise" },
];

describe("layoutWeb", () => {
  it("is deterministic", () => {
    expect(layoutWeb(nodes, edges, "me")).toEqual(layoutWeb(nodes, edges, "me"));
  });

  it("keeps the pinned node in the middle", () => {
    const me = layoutWeb(nodes, edges, "me").find((p) => p.id === "me")!;
    expect(me.x).toBe(0);
    expect(me.y).toBe(0);
  });

  it("puts parents above and children below", () => {
    const placed = layoutWeb(nodes, edges, "me");
    const y = (id: string) => placed.find((p) => p.id === id)!.y;
    expect(y("mum")).toBeLessThan(0);
    expect(y("kid")).toBeGreaterThan(0);
  });

  it("ignores edges to unknown nodes", () => {
    expect(layoutWeb(nodes, [...edges, { a: "me", b: "gone" }], "me")).toEqual(layoutWeb(nodes, edges, "me"));
  });
});

describe("crossings", () => {
  // The /people web from the bug report: parents + brother all linked to each other and to
  // you (a K4: with parents held on the row above, one crossing can't be avoided), your
  // girlfriend, and two friends linked only to each other.
  const family: WebNode[] = [
    { id: "me", name: "You", level: 0 },
    { id: "mama", name: "Mama", level: -1 },
    { id: "papa", name: "Papa", level: -1 },
    { id: "simon", name: "Simon", level: 0 },
    { id: "louise", name: "Louise" },
    { id: "jasper", name: "Jasper" },
    { id: "emile", name: "Emile" },
  ];
  const lines: WebEdge[] = [
    { a: "me", b: "mama" },
    { a: "me", b: "papa" },
    { a: "me", b: "simon" },
    { a: "me", b: "louise" },
    { a: "mama", b: "papa" },
    { a: "mama", b: "simon" },
    { a: "papa", b: "simon" },
    { a: "jasper", b: "emile" },
  ];

  it("counts crossing lines, not lines meeting at a person", () => {
    const square = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 10, y: 10 },
      { id: "c", x: 10, y: 0 },
      { id: "d", x: 0, y: 10 },
    ];
    expect(countCrossings(square, [{ a: "a", b: "b" }, { a: "c", b: "d" }])).toBe(1);
    expect(countCrossings(square, [{ a: "a", b: "b" }, { a: "a", b: "c" }])).toBe(0);
    expect(countCrossings(square, [{ a: "a", b: "c" }, { a: "d", b: "b" }])).toBe(0);
  });

  it("keeps a pair linked only to each other off your lines", () => {
    const placed = layoutWeb(family, lines, "me");
    expect(countCrossings(placed, lines)).toBeLessThanOrEqual(1);
    const others = lines.filter((l) => l.a !== "jasper");
    for (const l of others) expect(countCrossings(placed, [l, { a: "jasper", b: "emile" }])).toBe(0);
  });

  it("puts a label off a line that crosses it", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    // A line straight through the usual spot (62 %).
    const size = { w: 20, h: 10 };
    const spot = labelSpot(from, to, size, [[{ x: 62, y: -50 }, { x: 62, y: 50 }]], [], 14);
    expect(Math.abs(spot.x - 62)).toBeGreaterThanOrEqual(14);
    expect(spot.y).toBe(0);
  });

  it("keeps a label off a wide name", () => {
    // A 60-wide name centred at 70 covers 40–100, so 50 %, 62 %, 75 % and 85 % are out.
    const spot = labelSpot({ x: 0, y: 0 }, { x: 100, y: 0 }, { w: 20, h: 10 }, [], [{ x: 70, y: 0, w: 60, h: 10 }], 0);
    expect(spot.x).toBeLessThanOrEqual(30);
  });
});

describe("bounds", () => {
  it("pads the box around every point", () => {
    expect(bounds([{ x: -10, y: 5 }, { x: 20, y: -15 }], 4)).toEqual({ x: -14, y: -19, width: 38, height: 28 });
  });
});

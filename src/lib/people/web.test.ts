import { describe, expect, it } from "vitest";
import { bounds, layoutWeb, type WebEdge, type WebNode } from "./web";

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

describe("bounds", () => {
  it("pads the box around every point", () => {
    expect(bounds([{ x: -10, y: 5 }, { x: 20, y: -15 }], 4)).toEqual({ x: -14, y: -19, width: 38, height: 28 });
  });
});

import { describe, expect, it } from "vitest";
import { mirrorLabel, orientLink, viewLink } from "./links";
import { layoutWeb } from "./web";

describe("orientLink / viewLink", () => {
  it("stores the smaller id as A and reads back the same from both pages", () => {
    // On Louise's page: "Anna is Louise's mum", "Louise is Anna's daughter".
    const row = orientLink("louise", "anna", "daughter", "mum");
    expect(row).toEqual({ aId: "anna", bId: "louise", aLabel: "mum", bLabel: "daughter" });
    const link = { id: "l1", ...row };
    expect(viewLink(link, "louise")).toEqual({ id: "l1", otherId: "anna", otherIs: "mum", selfIs: "daughter" });
    expect(viewLink(link, "anna")).toEqual({ id: "l1", otherId: "louise", otherIs: "daughter", selfIs: "mum" });
  });
});

describe("mirrorLabel", () => {
  it("only mirrors labels that read the same both ways", () => {
    expect(mirrorLabel("Friend ")).toBe("friend");
    expect(mirrorLabel("mum")).toBeNull();
  });
});

describe("layoutWeb", () => {
  it("is deterministic and keeps linked people closer than strangers", () => {
    const nodes = ["a", "b", "c"].map((id) => ({ id, name: id }));
    const edges = [{ a: "a", b: "b" }];
    const first = layoutWeb(nodes, edges);
    expect(layoutWeb(nodes, edges)).toEqual(first);
    const dist = (i: number, j: number) => Math.hypot(first[i].x - first[j].x, first[i].y - first[j].y);
    expect(first.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(dist(0, 1)).toBeLessThan(dist(0, 2));
  });
});

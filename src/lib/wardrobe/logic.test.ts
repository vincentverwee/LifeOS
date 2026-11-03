import { describe, expect, it } from "vitest";
import { describeUnavailable, describeWorn, groupByCategory, outfitReadiness, type OutfitPiece } from "./logic";

const piece = (id: string, status: OutfitPiece["status"], isArchived = false): OutfitPiece => ({
  id,
  name: id,
  status,
  isArchived,
});

describe("outfitReadiness", () => {
  it("is ready when everything is clean", () => {
    expect(outfitReadiness([piece("a", "clean"), piece("b", "clean")])).toEqual({ ready: true, unavailable: [] });
  });
  it("lists pieces in the wash or drying", () => {
    const r = outfitReadiness([piece("a", "clean"), piece("b", "wash"), piece("c", "drying")]);
    expect(r.ready).toBe(false);
    expect(r.unavailable.map((p) => p.id)).toEqual(["b", "c"]);
  });
  it("ignores archived pieces", () => {
    expect(outfitReadiness([piece("a", "wash", true)]).ready).toBe(true);
  });
});

describe("describeUnavailable", () => {
  it("counts per status", () => {
    expect(describeUnavailable([piece("a", "wash"), piece("b", "wash"), piece("c", "drying")])).toBe("2 in the wash, 1 drying");
  });
});

describe("describeWorn", () => {
  it("describes how long ago", () => {
    expect(describeWorn(null, "2026-11-03")).toBe("Never worn");
    expect(describeWorn("2026-11-03", "2026-11-03")).toBe("Worn today");
    expect(describeWorn("2026-11-02", "2026-11-03")).toBe("Worn yesterday");
    expect(describeWorn("2026-10-30", "2026-11-03")).toBe("Worn 4 days ago");
  });
});

describe("groupByCategory", () => {
  const cats = [
    { id: "t", name: "Tops" },
    { id: "s", name: "Shoes" },
    { id: "b", name: "Bottoms" },
  ];
  it("follows the category order, drops empty ones, puts loose items last", () => {
    const items = [
      { id: "1", categoryId: "b" },
      { id: "2", categoryId: null },
      { id: "3", categoryId: "t" },
      { id: "4", categoryId: "gone" },
      { id: "5", categoryId: "t" },
    ];
    expect(groupByCategory(items, cats).map((g) => [g.name, g.items.map((i) => i.id)])).toEqual([
      ["Tops", ["3", "5"]],
      ["Bottoms", ["1"]],
      ["No category", ["2", "4"]],
    ]);
  });
});

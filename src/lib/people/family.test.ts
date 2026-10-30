import { describe, expect, it } from "vitest";
import { familyLevel, groupColor, suggestLinks } from "./family";

const simon = { id: "s", name: "Simon", relationToMe: "brother" };
const mama = { id: "m", name: "Mama", relationToMe: "mum" };
const papa = { id: "p", name: "Papa", relationToMe: "dad" };
const emma = { id: "e", name: "Emma", relationToMe: "sister" };
const louise = { id: "l", name: "Louise", relationToMe: "girlfriend" };
const everyone = [simon, mama, papa, emma, louise];

describe("suggestLinks", () => {
  it("gives a sibling your parents and your other siblings", () => {
    expect(suggestLinks(simon, everyone, new Set())).toEqual([
      { otherId: "e", otherName: "Emma", otherIs: "sister", selfIs: "brother" },
      { otherId: "m", otherName: "Mama", otherIs: "mum", selfIs: "son" },
      { otherId: "p", otherName: "Papa", otherIs: "dad", selfIs: "son" },
    ]);
  });

  it("gives a parent your siblings as children and the other parent as partner", () => {
    expect(suggestLinks(mama, everyone, new Set(["s"]))).toEqual([
      { otherId: "e", otherName: "Emma", otherIs: "daughter", selfIs: "mum" },
      { otherId: "p", otherName: "Papa", otherIs: "partner", selfIs: "partner" },
    ]);
  });

  it("suggests nothing outside the family", () => {
    expect(suggestLinks(louise, everyone, new Set())).toEqual([]);
  });
});

describe("familyLevel / groupColor", () => {
  it("puts parents above and siblings level with you", () => {
    expect(familyLevel("Mum")).toBe(-1);
    expect(familyLevel("brother")).toBe(0);
    expect(familyLevel("girlfriend")).toBeNull();
  });

  it("colours a group by its place in the list", () => {
    expect(groupColor("Family", ["Family", "Friends"])).toBe("var(--color-tag-blue)");
    expect(groupColor("Friends", ["Family", "Friends"])).toBe("var(--color-tag-orange)");
    expect(groupColor(null, ["Family"])).toBe("var(--color-ink-muted)");
  });
});

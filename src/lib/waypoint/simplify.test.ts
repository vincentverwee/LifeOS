import { describe, expect, it } from "vitest";
import { overviewOf, simplifyLine } from "./simplify";

// A wiggly 1000-point road: tiny sideways jitter (~1 m) along a straight 1° line.
const road: GeoJSON.LineString = {
  type: "LineString",
  coordinates: Array.from({ length: 1000 }, (_, i) => [4 + i / 1000, 51 + (i % 2) * 0.00001]),
};

describe("overviewOf", () => {
  it("is null without a route", () => {
    expect(overviewOf(null)).toBeNull();
  });

  it("thins a line and rounds to 5 decimals", () => {
    const out = overviewOf(road) as GeoJSON.LineString;
    expect(out.type).toBe("LineString");
    expect(out.coordinates.length).toBeLessThan(10);
    expect(out.coordinates[0]).toEqual([4, 51]);
    for (const [x, y] of out.coordinates) {
      expect(Math.round(x * 1e5) / 1e5).toBe(x);
      expect(Math.round(y * 1e5) / 1e5).toBe(y);
    }
  });

  it("keeps a flight-split route as separate parts", () => {
    const multi: GeoJSON.MultiLineString = {
      type: "MultiLineString",
      coordinates: [road.coordinates.slice(0, 500), road.coordinates.slice(500)],
    };
    const out = overviewOf(multi) as GeoJSON.MultiLineString;
    expect(out.type).toBe("MultiLineString");
    expect(out.coordinates).toHaveLength(2);
  });

  it("keeps real corners", () => {
    const corner: GeoJSON.LineString = { type: "LineString", coordinates: [[0, 0], [0.5, 0.0000001], [1, 0], [1, 1]] };
    expect(simplifyLine(corner, 0.0001).coordinates).toEqual([[0, 0], [1, 0], [1, 1]]);
    expect((overviewOf(corner) as GeoJSON.LineString).coordinates).toEqual([[0, 0], [1, 0], [1, 1]]);
  });
});

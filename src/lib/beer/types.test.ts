import { describe, it, expect } from "vitest";
import { MAX_PINTS, MAX_PUB_NAME, parsePints, parsePubChoice } from "@/lib/beer/types";

const place = { osmId: "node/123", latitude: 53.27, longitude: -9.05 };

describe("parsePubChoice", () => {
  it("rejects non-objects", () => {
    for (const value of [null, undefined, "known", 3, true]) expect(parsePubChoice(value)).toBeNull();
    expect(parsePubChoice({})).toBeNull();
    expect(parsePubChoice({ kind: "other", name: "X" })).toBeNull();
  });

  describe("known", () => {
    it("keeps the id and a valid place", () => {
      expect(parsePubChoice({ kind: "known", id: "p1" })).toEqual({ kind: "known", id: "p1" });
      expect(parsePubChoice({ kind: "known", id: "p1", place })).toEqual({ kind: "known", id: "p1", place });
    });

    it("drops an invalid place but keeps the pub", () => {
      for (const bad of [
        { ...place, osmId: "pub/1" },
        { ...place, latitude: "53.27" },
        { ...place, latitude: 91 },
        { ...place, longitude: -181 },
        { osmId: "node/1", latitude: 53 },
      ]) {
        expect(parsePubChoice({ kind: "known", id: "p1", place: bad })).toEqual({ kind: "known", id: "p1" });
      }
    });

    it("rejects a missing or overlong id", () => {
      expect(parsePubChoice({ kind: "known" })).toBeNull();
      expect(parsePubChoice({ kind: "known", id: "x".repeat(41) })).toBeNull();
    });
  });

  describe("osm", () => {
    const osm = { kind: "osm", osmId: "way/42", name: " The Crane ", latitude: 53.27, longitude: -9.06 };

    it("keeps a full place, name trimmed", () => {
      expect(parsePubChoice(osm)).toEqual({ ...osm, name: "The Crane" });
    });

    it("needs a valid osmId, a name and both coordinates as numbers", () => {
      expect(parsePubChoice({ ...osm, osmId: "way/abc" })).toBeNull();
      expect(parsePubChoice({ ...osm, name: "  " })).toBeNull();
      expect(parsePubChoice({ ...osm, latitude: "53.27" })).toBeNull();
      expect(parsePubChoice({ ...osm, longitude: undefined })).toBeNull();
      expect(parsePubChoice({ ...osm, latitude: -90.1 })).toBeNull();
      expect(parsePubChoice({ ...osm, longitude: 180.5 })).toBeNull();
      expect(parsePubChoice({ ...osm, latitude: Number.NaN })).toBeNull();
    });

    it("accepts the edges of the coordinate ranges", () => {
      expect(parsePubChoice({ ...osm, latitude: -90, longitude: 180 })).toMatchObject({ latitude: -90, longitude: 180 });
    });
  });

  describe("typed", () => {
    it("trims the name and cuts it to MAX_PUB_NAME", () => {
      expect(parsePubChoice({ kind: "typed", name: "  Sult  " })).toEqual({ kind: "typed", name: "Sult" });
      const long = parsePubChoice({ kind: "typed", name: "x".repeat(MAX_PUB_NAME + 20) });
      expect(long).toEqual({ kind: "typed", name: "x".repeat(MAX_PUB_NAME) });
    });

    it("rejects an empty name", () => {
      expect(parsePubChoice({ kind: "typed", name: "   " })).toBeNull();
      expect(parsePubChoice({ kind: "typed", name: 42 })).toBeNull();
    });

    it("keeps the position only when both coordinates are valid", () => {
      expect(parsePubChoice({ kind: "typed", name: "Sult", latitude: 53.2, longitude: -9 })).toEqual({
        kind: "typed",
        name: "Sult",
        latitude: 53.2,
        longitude: -9,
      });
      expect(parsePubChoice({ kind: "typed", name: "Sult", latitude: 53.2 })).toEqual({ kind: "typed", name: "Sult" });
      expect(parsePubChoice({ kind: "typed", name: "Sult", latitude: "53.2", longitude: "-9" })).toEqual({
        kind: "typed",
        name: "Sult",
      });
    });
  });
});

describe("parsePints", () => {
  it("accepts whole numbers 1–MAX_PINTS, also as strings", () => {
    expect(parsePints(1)).toBe(1);
    expect(parsePints(MAX_PINTS)).toBe(MAX_PINTS);
    expect(parsePints("3")).toBe(3);
  });

  it("rejects everything else", () => {
    for (const value of [0, -1, MAX_PINTS + 1, 1.5, "1,5", "", "abc", null, undefined, Number.NaN]) {
      expect(parsePints(value)).toBeNull();
    }
  });
});

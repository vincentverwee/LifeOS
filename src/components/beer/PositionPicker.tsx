"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { searchPlaces, type GeocodingResult } from "@/lib/waypoint/geocoding";

export type Position = { latitude: number; longitude: number };

/** Where a pub without a position starts when there's no search yet. */
const DEFAULT_CENTER: [number, number] = [-9.05, 53.272];

/**
 * A map with one pin: search a place (or the pub's name + town) to fly there, then tap
 * the map to put the pin down, or drag it. Reports each move with `onChange`. On touch
 * it sits in a scrolling page, so it uses cooperativeGestures: two fingers pan, one scrolls
 * the page (a tap still puts the pin down).
 */
export default function PositionPicker({
  initial,
  onChange,
}: {
  initial: Position | null;
  onChange: (position: Position) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const placeRef = useRef<((lngLat: maplibregl.LngLatLike) => void) | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const initialRef = useRef(initial);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const start = initialRef.current;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#1f5c3b";
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: start ? [start.longitude, start.latitude] : DEFAULT_CENTER,
      zoom: start ? 17 : 14,
      cooperativeGestures: window.matchMedia("(pointer: coarse)").matches,
    });
    mapRef.current = map;
    if (!window.matchMedia("(pointer: coarse)").matches) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    }

    const report = (p: maplibregl.LngLat) => onChangeRef.current({ latitude: p.lat, longitude: p.lng });
    let marker: maplibregl.Marker | null = null;
    const place = (lngLat: maplibregl.LngLatLike) => {
      if (!marker) {
        marker = new maplibregl.Marker({ color, draggable: true }).setLngLat(lngLat).addTo(map);
        marker.on("dragend", () => report(marker!.getLngLat()));
      } else {
        marker.setLngLat(lngLat);
      }
      report(marker.getLngLat());
    };
    placeRef.current = place;
    if (start) {
      marker = new maplibregl.Marker({ color, draggable: true }).setLngLat([start.longitude, start.latitude]).addTo(map);
      marker.on("dragend", () => report(marker!.getLngLat()));
    }
    map.on("click", (e) => place(e.lngLat));

    return () => {
      mapRef.current = null;
      placeRef.current = null;
      map.remove();
    };
  }, []);

  async function search() {
    setMessage(null);
    setResults([]);
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const found = await searchPlaces(query);
      setResults(found.slice(0, 5));
      if (found.length === 0) setMessage("Nothing found. Try the town, or tap the map.");
    } catch {
      setMessage("Search didn't work. Pan the map and tap instead.");
    } finally {
      setSearching(false);
    }
  }

  function go(result: GeocodingResult) {
    const lngLat: [number, number] = [Number(result.lon), Number(result.lat)];
    mapRef.current?.flyTo({ center: lngLat, zoom: 17 });
    placeRef.current?.(lngLat);
    setResults([]);
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
          placeholder="Search a town or street"
          aria-label="Search a place"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground"
        />
        <button type="submit" disabled={searching} className="btn btn-outline min-h-11 px-4 text-sm">
          {searching ? "…" : "Search"}
        </button>
      </form>
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`} className="border-b border-border last:border-b-0">
              <button type="button" onClick={() => go(r)} className="tap flex min-h-11 w-full items-center px-3 py-2 text-left text-sm text-foreground">
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="text-sm text-ink-muted">{message}</p>}
      <div ref={containerRef} className="min-h-64 flex-1 overflow-hidden rounded-2xl" />
    </div>
  );
}

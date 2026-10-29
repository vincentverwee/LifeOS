"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapPub = { id: string; name: string; latitude: number; longitude: number; visits: number };

const SOURCE = "pubs";

/** The theme's primary colour (green for Meadow, pink for the cat theme). */
function primary(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() || "#1f5c3b";
}

/**
 * Your pubs as small dots in the theme colour; a tap opens the pub. Same tiles as
 * Waypoint's maps. `cooperativeGestures` (touch only) lets one finger scroll the page.
 */
export default function PubMap({ pubs, cooperativeGestures = true }: { pubs: MapPub[]; cooperativeGestures?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // A server re-render (any save) hands a new array with the same pubs: key on the content.
  const pubsKey = JSON.stringify(pubs);

  useEffect(() => {
    if (!containerRef.current) return;
    const pubs: MapPub[] = JSON.parse(pubsKey);
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [-9.05, 53.27],
      zoom: 13,
      cooperativeGestures: touch && cooperativeGestures,
    });
    if (!touch) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: pubs.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
        properties: { id: p.id, name: p.name, visits: p.visits },
      })),
    };

    map.on("load", () => {
      const color = primary();
      map.addSource(SOURCE, { type: "geojson", data });
      map.addLayer({
        id: "pub-dots",
        type: "circle",
        source: SOURCE,
        paint: {
          // One small dot per pub, however often you've been: lots of pubs stay readable.
          "circle-color": color,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 14, 6],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });
      // Invisible, finger-sized: the dots are small, taps shouldn't have to be.
      map.addLayer({
        id: "pub-hit",
        type: "circle",
        source: SOURCE,
        paint: { "circle-radius": 18, "circle-opacity": 0 },
      });
      map.addLayer({
        id: "pub-labels",
        type: "symbol",
        source: SOURCE,
        minzoom: 14,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
        },
        paint: { "text-color": "#1f2933", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      });

      if (pubs.length === 1) {
        map.jumpTo({ center: [pubs[0].longitude, pubs[0].latitude], zoom: 15 });
      } else if (pubs.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        for (const p of pubs) bounds.extend([p.longitude, p.latitude]);
        map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 0 });
      }
    });

    map.on("click", "pub-hit", (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") routerRef.current.push(`/beer/pubs/${id}`);
    });
    map.on("mouseenter", "pub-hit", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "pub-hit", () => (map.getCanvas().style.cursor = ""));

    return () => map.remove();
  }, [pubsKey, cooperativeGestures]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-2xl" />;
}

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Location } from '@/lib/waypoint/types';
import { cn } from '@/lib/waypoint/utils';
import { colorForTrip } from '@/lib/waypoint/tripColors';
import { SheepSpinner } from '@/components/icons/SheepSpinner';
import { SheepPhrase } from '@/components/icons/SheepPhrase';
import { TripLegend, type LegendChip } from './TripLegend';
import type { RouteGeometry } from '@/lib/waypoint/routing/lines';

function MapPlaceholder() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-muted"
    >
      <SheepSpinner size={48} />
      <SheepPhrase />
    </div>
  );
}

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <MapPlaceholder />,
});

interface MapWrapperProps {
  className?: string;
  locations?: Location[];
  routeGeometry?: RouteGeometry | null;
  routes?: { tripId: string; geometry: GeoJSON.LineString }[];
  tripLabels?: Record<string, string>;
  tripColors?: Record<string, string>;
  markerStyle?: 'numbered' | 'dot' | 'none';
  accentColor?: string;
  showLabels?: boolean;
  labeledIds?: string[];
  labelOverrides?: Record<string, string>;
  reserveBottom?: number;
  showControls?: boolean;
  /** See MapView: one finger scrolls the page on touch screens. */
  cooperativeGestures?: boolean;
  pixelRatio?: number;
  onReady?: () => void;
  /** Multi-trip maps (dashboard, world map): show the trip-focus legend + enable tap-to-focus. */
  selectable?: boolean;
  /** Keep the WebGL drawing buffer after each compositor swap. Required only for the export
   *  pages, whose `modern-screenshot` capture reads pixels back out of the canvas; it costs
   *  memory and blocks a compositor fast path, so ordinary maps leave it off. */
  preserveDrawingBuffer?: boolean;
  /** Load MapLibre immediately instead of waiting for the map to scroll into view. Set on the
   *  export pages, where the map IS the page. */
  priority?: boolean;
}

export function MapWrapper({
  className,
  locations,
  routeGeometry,
  routes,
  tripLabels,
  tripColors,
  markerStyle,
  accentColor,
  showLabels,
  labeledIds,
  labelOverrides,
  reserveBottom,
  showControls,
  cooperativeGestures,
  pixelRatio,
  onReady,
  selectable = false,
  preserveDrawingBuffer = false,
  priority = false,
}: MapWrapperProps) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // MapLibre GL is by far the heaviest thing this app loads (library + WebGL context + tiles).
  // On the dashboard and the trip detail page the map sits below the fold on a phone, so mounting
  // it eagerly spends the main thread on a map the user cannot see yet -- which is exactly when
  // they are tapping around. Hold the dynamic import until the map is near the viewport.
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(priority);

  useEffect(() => {
    if (visible) return;
    const el = hostRef.current;
    // No element yet, or a browser without IntersectionObserver: fall back to mounting now.
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Start loading a screenful early so it is ready by the time it is scrolled to.
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  // Legend chips: one per trip that actually has a route drawn, in the order the routes arrive
  // (pages sort them chronologically). Label from tripLabels, color from tripColors (fallback hash).
  const chips = useMemo<LegendChip[]>(() => {
    if (!selectable || !routes?.length) return [];
    const seen = new Set<string>();
    const out: LegendChip[] = [];
    for (const r of routes) {
      if (seen.has(r.tripId)) continue;
      seen.add(r.tripId);
      out.push({
        id: r.tripId,
        label: tripLabels?.[r.tripId] ?? 'Trip',
        color: tripColors?.[r.tripId] ?? colorForTrip(r.tripId),
      });
    }
    return out;
  }, [selectable, routes, tripLabels, tripColors]);

  const showLegend = selectable && chips.length > 0;

  const placeholder = <MapPlaceholder />;

  const map = !visible ? (
    placeholder
  ) : (
    <MapView
      locations={locations}
      routeGeometry={routeGeometry}
      routes={routes}
      tripLabels={tripLabels}
      tripColors={tripColors}
      markerStyle={markerStyle}
      accentColor={accentColor}
      showLabels={showLabels}
      labeledIds={labeledIds}
      labelOverrides={labelOverrides}
      reserveBottom={reserveBottom}
      showControls={showControls}
      cooperativeGestures={cooperativeGestures}
      pixelRatio={pixelRatio}
      preserveDrawingBuffer={preserveDrawingBuffer}
      onReady={onReady}
      selectedTripId={showLegend ? selectedTripId : null}
      onSelectTrip={showLegend ? setSelectedTripId : undefined}
    />
  );

  if (!showLegend) {
    return (
      <div ref={hostRef} className={cn('min-w-0', className)}>
        {map}
      </div>
    );
  }

  // Legend on top (shrink-0), map fills the rest. `min-w-0` lets this item shrink below the
  // legend's intrinsic (nowrap chips) width so the legend scrolls internally instead of pushing
  // the whole page wider than the viewport on mobile.
  return (
    <div ref={hostRef} className={cn('flex min-w-0 flex-col gap-3', className)}>
      <TripLegend chips={chips} selectedId={selectedTripId} onSelect={setSelectedTripId} />
      <div className="min-h-0 min-w-0 flex-1">{map}</div>
    </div>
  );
}

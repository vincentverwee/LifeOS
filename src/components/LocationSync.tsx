"use client";

import { useEffect } from "react";
import { setWeatherLocation } from "@/lib/actions/push";
import { LOCATION_REFRESH_HOURS, quietPosition, readLocationMarker, writeLocationMarker } from "@/lib/push/device";

/**
 * Keeps a GPS weather location current when travelling: on app open, at most every
 * few hours, and only if location access is already granted (it never prompts).
 */
export function LocationSync() {
  useEffect(() => {
    const marker = readLocationMarker();
    if (marker?.source !== "gps" || Date.now() - marker.at < LOCATION_REFRESH_HOURS * 3_600_000) return;
    void (async () => {
      const registration = await navigator.serviceWorker?.getRegistration();
      const endpoint = (await registration?.pushManager?.getSubscription())?.endpoint;
      if (!endpoint) return;
      const position = await quietPosition();
      if (!position) return;
      const result = await setWeatherLocation(endpoint, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        source: "gps",
        refresh: true,
      });
      // Not following GPS any more (a city was picked elsewhere, or push is off): stop trying.
      writeLocationMarker(result.ok ? "gps" : null);
    })().catch(() => {});
  }, []);

  return null;
}

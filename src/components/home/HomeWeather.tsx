"use client";

import { useEffect, useState } from "react";
import type { HomeWeather as Weather } from "@/app/api/weather/route";

/**
 * Today's weather under the greeting. Only on a device with notifications on and a
 * weather location (both per device, on /settings); otherwise nothing is shown.
 */
export function HomeWeather() {
  const [weather, setWeather] = useState<Weather>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const registration = await navigator.serviceWorker?.getRegistration();
      const endpoint = (await registration?.pushManager?.getSubscription())?.endpoint;
      if (!endpoint) return;
      const res = await fetch(`/api/weather?endpoint=${encodeURIComponent(endpoint)}`, { signal: controller.signal });
      if (res.ok) setWeather((await res.json()) as Weather);
    })().catch(() => {});
    return () => controller.abort();
  }, []);

  if (!weather) return null;
  return (
    <p className="mt-1 text-sm text-ink-muted">
      {weather.place && <span className="text-foreground">{weather.place} · </span>}
      {weather.line}
    </p>
  );
}

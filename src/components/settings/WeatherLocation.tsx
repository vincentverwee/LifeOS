"use client";

import { useEffect, useState, useTransition } from "react";
import { clearWeatherLocation, setWeatherLocation, type LocationInput } from "@/lib/actions/push";
import { writeLocationMarker, type DeviceStatus } from "@/lib/push/device";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

export type DeviceLocation = { endpoint: string; placeLabel: string | null; locationSource: string | null };

type Place = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string };

/** City search: Open-Meteo's geocoding (free, no key, allows browser calls). */
async function searchPlaces(query: string, signal: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as { results?: Place[] }).results ?? [];
}

export function WeatherLocation({ status, devices }: { status: DeviceStatus; devices: DeviceLocation[] }) {
  const endpoint = status.kind === "ready" ? status.endpoint : null;
  const device = endpoint ? devices.find((d) => d.endpoint === endpoint) : undefined;

  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; places: Place[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Keep LocationSync's marker in line with the server (e.g. after a reinstall).
  useEffect(() => {
    if (device) writeLocationMarker(device.locationSource === "gps" || device.locationSource === "city" ? device.locationSource : null);
  }, [device]);

  // Searches as you type (debounced); results remember which query they are for.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPlaces(q, controller.signal)
        .then((places) => {
          setFound({ query: q, places });
          setError(null);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setFound({ query: q, places: [] });
          setError("Couldn't search right now. Try again in a moment.");
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const q = query.trim();
  const results = q.length >= 2 && found?.query === q ? found.places : null;
  const searching = q.length >= 2 && !results;

  if (status.kind === "checking") return null;

  const note = (text: string) => <p className="rounded-xl border border-border bg-surface p-4 text-sm text-ink-muted">{text}</p>;
  if (!device) {
    return note(
      "The weather appears in the morning digest, which is a push notification. Turn on notifications on this device first, then pick a place here."
    );
  }

  function save(input: LocationInput) {
    if (!device) return;
    setError(null);
    startTransition(async () => {
      const result = await setWeatherLocation(device.endpoint, input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      writeLocationMarker(input.source);
      setEditing(false);
      setQuery("");
    });
  }

  function locateMe() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("This browser can't share its location. Pick a city instead.");
      return;
    }
    // Asked inside the tap: iOS only prompts from a user gesture.
    navigator.geolocation.getCurrentPosition(
      (position) => save({ latitude: position.coords.latitude, longitude: position.coords.longitude, source: "gps" }),
      () => setError("No location — allow it for LifeOS in Settings → Privacy → Location Services, or pick a city."),
      { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 20_000 }
    );
  }

  function remove() {
    if (!device) return;
    setError(null);
    startTransition(async () => {
      await clearWeatherLocation(device.endpoint);
      writeLocationMarker(null);
      setEditing(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 rounded-xl border border-border bg-surface px-4 py-2">
        <span className="text-ink-muted">Weather for:</span>
        <span className="font-medium text-foreground">{device.placeLabel ?? "Not set"}</span>
        {device.locationSource === "gps" && <span className="text-sm text-ink-muted">(follows you)</span>}
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost -mr-3 ml-auto inline-flex min-h-11 px-3 text-sm">
            {device.placeLabel ? "Change" : "Set"}
          </button>
        )}
      </div>

      {editing && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={locateMe}
            disabled={pending}
            className="btn btn-primary flex w-full px-4 py-3.5 text-base font-semibold"
          >
            {pending ? <SheepSpinner size={20} /> : "Use my location"}
          </button>
          <p className="-mt-1 text-sm text-ink-muted">Updates by itself when you open the app somewhere else.</p>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-ink-muted">Or pick a city</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Galway"
              autoComplete="off"
              enterKeyHint="search"
              className="min-h-11 rounded-xl border border-border bg-surface px-4 text-foreground"
            />
          </label>

          {searching && (
            <div className="flex justify-center py-2">
              <SheepSpinner size={24} />
            </div>
          )}
          {results && results.length === 0 && !error && <p className="text-sm text-ink-muted">No places found.</p>}
          {results && results.length > 0 && (
            <ul className="overflow-hidden rounded-xl border border-border bg-surface">
              {results.map((place) => (
                <li key={place.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      save({ latitude: place.latitude, longitude: place.longitude, label: place.name, source: "city" })
                    }
                    className="tap flex min-h-11 w-full flex-col items-start px-4 py-2.5 text-left"
                  >
                    <span className="text-foreground">{place.name}</span>
                    <span className="text-sm text-ink-muted">{[place.admin1, place.country].filter(Boolean).join(", ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
              Cancel
            </button>
            {device.placeLabel && (
              <button type="button" onClick={remove} disabled={pending} className="btn btn-ghost inline-flex min-h-11 px-3 text-sm">
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-critical">{error}</p>}
      <p className="text-sm text-ink-muted">One line at the top of the morning digest. It never sends a notification by itself.</p>
    </div>
  );
}

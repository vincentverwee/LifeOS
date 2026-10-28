// Browser-side: this device's push subscription, and the small marker that tells
// LocationSync whether to refresh a GPS weather location.

export type DeviceStatus =
  | { kind: "checking" }
  | { kind: "unsupported" } // not the Home Screen app, or an old iOS
  | { kind: "no-worker" } // development: the service worker is production-only
  | { kind: "blocked" }
  | { kind: "ready"; endpoint: string | null }; // null = not subscribed here

export async function detectDevice(): Promise<DeviceStatus> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
    return { kind: "unsupported" };
  }
  if (Notification.permission === "denied") return { kind: "blocked" };
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return { kind: "no-worker" };
  const subscription = await registration.pushManager.getSubscription();
  return { kind: "ready", endpoint: subscription?.endpoint ?? null };
}

/** Refresh a GPS location at most this often (on app open). */
export const LOCATION_REFRESH_HOURS = 3;

const MARKER = "lifeos-weather-location";
type Marker = { source: "gps" | "city"; at: number };

export function readLocationMarker(): Marker | null {
  try {
    const value = JSON.parse(localStorage.getItem(MARKER) ?? "null") as Marker | null;
    return value && (value.source === "gps" || value.source === "city") && typeof value.at === "number" ? value : null;
  } catch {
    return null;
  }
}

export function writeLocationMarker(source: Marker["source"] | null) {
  try {
    if (source) localStorage.setItem(MARKER, JSON.stringify({ source, at: Date.now() }));
    else localStorage.removeItem(MARKER);
  } catch {
    // private mode: the refresh just doesn't happen
  }
}

/** The current position, without ever prompting: only when permission is already granted. */
export async function quietPosition(): Promise<GeolocationPosition | null> {
  try {
    const permission = await navigator.permissions?.query({ name: "geolocation" });
    if (permission?.state !== "granted") return null;
    return await new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
        enableHighAccuracy: false,
        maximumAge: 30 * 60_000,
        timeout: 15_000,
      })
    );
  } catch {
    return null;
  }
}

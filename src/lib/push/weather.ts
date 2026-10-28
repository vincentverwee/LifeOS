// The weather line in the morning digest, from Open-Meteo (free, no key). No
// "server-only" import so a tsx script can call it; only the scheduler uses it.

/** An hour counts as wet from this precipitation probability (%)… */
const RAIN_PROBABILITY = 50;
/** …and this much precipitation in that hour (mm). */
const RAIN_MM = 0.2;
/** Only these local hours [from, to) count for rain, clouds and wind. */
const DAY_HOURS: [number, number] = [7, 22];
/** Mention wind from this sustained speed or these gusts (km/h). */
const WINDY_KMH = 40;
const GUSTY_KMH = 65;
/** Average cloud cover (%) from which a dry day is cloudy rather than sunny. */
const CLOUDY_PERCENT = 70;
/** Kept short: a slow forecast must not hold up the cron. */
const FETCH_TIMEOUT_MS = 3000;
/** Coordinates are rounded to this many decimals (~10 km) so nearby devices share a forecast. */
const COORD_DECIMALS = 1;

// Open-Meteo sends null for hours it has no data for; those hours are left out.
export type HourlyForecast = {
  time: string[]; // local "YYYY-MM-DDTHH:MM"
  temperature_2m: (number | null)[];
  precipitation_probability: (number | null)[];
  precipitation: (number | null)[];
  wind_speed_10m: (number | null)[];
  wind_gusts_10m: (number | null)[];
  cloud_cover: (number | null)[];
};

// Several devices in the same area, in the same run, cost one call (the URL is
// per rounded coordinate and day; Next's fetch cache also keeps it across runs).
const forecasts = new Map<string, Promise<HourlyForecast | null>>();

function forecastUrl(latitude: number, longitude: number, timeZone: string, dayKey: string): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(COORD_DECIMALS),
    longitude: longitude.toFixed(COORD_DECIMALS),
    hourly: "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,cloud_cover",
    timezone: timeZone,
    start_date: dayKey,
    end_date: dayKey,
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

async function load(url: string): Promise<HourlyForecast | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), next: { revalidate: 6 * 3600 } });
    if (!res.ok) return null;
    const hourly = ((await res.json()) as { hourly?: HourlyForecast }).hourly;
    return hourly?.time?.length ? hourly : null;
  } catch {
    return null;
  }
}

export function fetchDayForecast(latitude: number, longitude: number, timeZone: string, dayKey: string) {
  const url = forecastUrl(latitude, longitude, timeZone, dayKey);
  if (!forecasts.has(url)) {
    const pending = load(url);
    forecasts.set(url, pending);
    void pending.then((f) => f ?? forecasts.delete(url)); // don't remember failures
  }
  return forecasts.get(url)!;
}

const hh = (time: string) => time.slice(11, 16);

/** The values of `series` at these hours, skipping hours without data. */
function known(series: (number | null)[] | undefined, hours: { i: number }[]): number[] {
  return hours.map((h) => series?.[h.i]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

/**
 * One line for the day, e.g. "☔ Rain from 15:00 · 9–13°C · 💨 gusts 70 km/h";
 * null when there are no temperatures at all.
 */
export function describeWeather(hourly: HourlyForecast): string | null {
  const [from, to] = DAY_HOURS;
  const hours = hourly.time
    .map((time, i) => ({ time, i, hour: Number(time.slice(11, 13)) }))
    .filter((h) => h.hour >= from && h.hour < to);
  const all = hours.length ? hours : hourly.time.map((time, i) => ({ time, i, hour: Number(time.slice(11, 13)) }));

  const temps = known(hourly.temperature_2m, all).map(Math.round);
  if (temps.length === 0) return null;
  const low = Math.min(...temps);
  const high = Math.max(...temps);
  const temp = low === high ? `${high}°C` : `${low}–${high}°C`;

  const wet = all.filter(
    (h) => (hourly.precipitation_probability[h.i] ?? 0) >= RAIN_PROBABILITY && (hourly.precipitation[h.i] ?? 0) >= RAIN_MM
  );
  let sky: string;
  if (wet.length === 0) {
    const cover = known(hourly.cloud_cover, all);
    const clouds = cover.length ? cover.reduce((sum, c) => sum + c, 0) / cover.length : null;
    sky = clouds === null ? "Dry all day" : clouds >= CLOUDY_PERCENT ? "☁️ Dry all day" : "☀️ Dry all day";
  } else if (wet.length >= all.length - 1) {
    sky = "☔ Rain all day";
  } else {
    const first = wet[0];
    const last = wet[wet.length - 1];
    // Rain that stops well before the evening gets an end time.
    const end = last.i + 1 < all[all.length - 1].i ? `–${hh(hourly.time[last.i + 1])}` : "";
    sky = end ? `☔ Rain ${hh(first.time)}${end}` : `☔ Rain from ${hh(first.time)}`;
  }

  // No data: 0, so it's simply not mentioned.
  const wind = Math.max(0, ...known(hourly.wind_speed_10m, all));
  const gusts = Math.max(0, ...known(hourly.wind_gusts_10m, all));
  const windy = gusts >= GUSTY_KMH ? ` · 💨 gusts ${Math.round(gusts / 5) * 5} km/h` : wind >= WINDY_KMH ? ` · 💨 windy, ${Math.round(wind / 5) * 5} km/h` : "";

  return `${sky} · ${temp}${windy}`;
}

type Located = { latitude: number | null; longitude: number | null; timeZone: string };

/** The weather line for a device on `dayKey`, or null (no location, or Open-Meteo failed). Never throws. */
export async function weatherLine(device: Located, dayKey: string): Promise<string | null> {
  if (device.latitude == null || device.longitude == null) return null;
  try {
    const hourly = await fetchDayForecast(device.latitude, device.longitude, device.timeZone, dayKey);
    return hourly ? describeWeather(hourly) : null;
  } catch {
    return null;
  }
}

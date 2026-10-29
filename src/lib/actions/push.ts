"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  ALL_PUSH_KINDS,
  defaultPushTime,
  isPushKind,
  isPushTime,
  isTimedPushKind,
  parsePushTimes,
  type PushKind,
} from "@/lib/push/kinds";
import { pushConfigured, sendPush } from "@/lib/push/send";

export type PushResult = { ok: true } | { ok: false; error: string };

type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string }; timeZone: string };

function validTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function cleanSubscription(input: SubscriptionInput) {
  const endpoint = String(input.endpoint ?? "");
  if (!endpoint.startsWith("https://") || endpoint.length > 1000) return null;
  const p256dh = String(input.keys?.p256dh ?? "");
  const auth = String(input.keys?.auth ?? "");
  if (!p256dh || !auth || p256dh.length > 200 || auth.length > 100) return null;
  const timeZone = validTimeZone(String(input.timeZone)) ? String(input.timeZone) : "Europe/Brussels";
  return { endpoint, p256dh, auth, timeZone };
}

/** Saves this device's subscription (all kinds on for a new one) and sends a test. */
export async function savePushSubscription(input: SubscriptionInput): Promise<PushResult> {
  await requireAuth();
  if (!pushConfigured()) return { ok: false, error: "Push isn't set up on the server (VAPID keys missing)." };
  const sub = cleanSubscription(input);
  if (!sub) return { ok: false, error: "The browser sent an invalid subscription." };
  const row = await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { ...sub, kinds: ALL_PUSH_KINDS },
    update: { p256dh: sub.p256dh, auth: sub.auth, timeZone: sub.timeZone },
  });
  revalidatePath("/settings");
  const sent = await sendPush(row, {
    title: "Notifications are on",
    body: "LifeOS will nudge you here.",
    url: "/settings",
    tag: "push-test",
  });
  return sent ? { ok: true } : { ok: false, error: "Saved, but the test notification didn't go through." };
}

/** Keeps the device's timezone current (it decides when "morning" is). */
export async function touchPushSubscription(endpoint: string, timeZone: string): Promise<PushResult> {
  await requireAuth();
  if (!validTimeZone(timeZone)) return { ok: false, error: "Unknown timezone." };
  await prisma.pushSubscription.updateMany({ where: { endpoint, NOT: { timeZone } }, data: { timeZone } });
  return { ok: true };
}

export async function setPushKinds(endpoint: string, kinds: PushKind[]): Promise<PushResult> {
  await requireAuth();
  const clean = [...new Set(kinds.filter(isPushKind))];
  const { count } = await prisma.pushSubscription.updateMany({ where: { endpoint }, data: { kinds: clean } });
  revalidatePath("/settings");
  return count ? { ok: true } : { ok: false, error: "This device isn't subscribed any more; turn notifications on again." };
}

/** Sets when one kind goes out on this device ("HH:MM", its local time). */
export async function setPushTime(endpoint: string, kind: PushKind, time: string): Promise<PushResult> {
  await requireAuth();
  if (!isTimedPushKind(kind) || !isPushTime(time)) return { ok: false, error: "That time doesn't look right." };
  const device = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { id: true, times: true } });
  if (!device) return { ok: false, error: "This device isn't subscribed any more; turn notifications on again." };
  const times = parsePushTimes(device.times);
  if (time === defaultPushTime(kind)) delete times[kind];
  else times[kind] = time;
  await prisma.pushSubscription.update({ where: { id: device.id }, data: { times } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<PushResult> {
  await requireAuth();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  revalidatePath("/settings");
  return { ok: true };
}

export type LocationSource = "gps" | "city";
export type LocationInput = {
  latitude: number;
  longitude: number;
  label?: string;
  source: LocationSource;
  /** A quiet refresh on app open (LocationSync), not a tap. */
  refresh?: boolean;
};
export type LocationResult = { ok: true; label: string } | { ok: false; error: string };

const NOT_SUBSCRIBED = "Weather goes in the morning notification: turn on notifications on this device first.";

/** The town for a GPS fix (Open-Meteo has no reverse geocoding; Nominatim needs no key). */
async function placeName(latitude: number, longitude: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10&accept-language=en`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LifeOS/1.0 (personal weather digest)" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const { address } = (await res.json()) as { address?: Record<string, string> };
    const name = address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? address?.county;
    return name ? name.slice(0, 80) : null;
  } catch {
    return null;
  }
}

/**
 * Sets this device's weather location. A quiet refresh only replaces a gps
 * location, so it never undoes a city picked by hand.
 */
export async function setWeatherLocation(endpoint: string, input: LocationInput): Promise<LocationResult> {
  await requireAuth();
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    return { ok: false, error: "That location doesn't look right." };
  }
  if (input.source !== "gps" && input.source !== "city") return { ok: false, error: "Unknown location source." };

  const device = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { id: true, locationSource: true } });
  if (!device) return { ok: false, error: NOT_SUBSCRIBED };
  if (input.refresh && device.locationSource !== "gps") return { ok: false, error: "This device doesn't follow GPS." };

  const label =
    (input.source === "city" ? String(input.label ?? "").trim().slice(0, 80) : await placeName(latitude, longitude)) ||
    `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  await prisma.pushSubscription.update({
    where: { id: device.id },
    data: { latitude, longitude, placeLabel: label, locationSource: input.source, locationAt: new Date() },
  });
  revalidatePath("/settings");
  return { ok: true, label };
}

export async function clearWeatherLocation(endpoint: string): Promise<PushResult> {
  await requireAuth();
  await prisma.pushSubscription.updateMany({
    where: { endpoint },
    data: { latitude: null, longitude: null, placeLabel: null, locationSource: null, locationAt: null },
  });
  revalidatePath("/settings");
  return { ok: true };
}

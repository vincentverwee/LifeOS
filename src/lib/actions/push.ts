"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ALL_PUSH_KINDS, isPushKind, type PushKind } from "@/lib/push/kinds";
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
  revalidatePath("/notifications");
  const sent = await sendPush(row, {
    title: "Notifications are on",
    body: "LifeOS will nudge you here.",
    url: "/notifications",
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
  revalidatePath("/notifications");
  return count ? { ok: true } : { ok: false, error: "This device isn't subscribed any more; turn notifications on again." };
}

export async function removePushSubscription(endpoint: string): Promise<PushResult> {
  await requireAuth();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  revalidatePath("/notifications");
  return { ok: true };
}

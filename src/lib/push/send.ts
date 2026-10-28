import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { PushPayload } from "@/lib/push/kinds";

type Target = { id: string; endpoint: string; p256dh: string; auth: string };

let configured = false;

/** False when the VAPID keys aren't set (push is then simply off). */
export function pushConfigured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:lifeos@example.com", publicKey, privateKey);
    configured = true;
  }
  return true;
}

/**
 * Sends one notification. A subscription the push service no longer knows
 * (404/410: app removed, permission revoked) is deleted. Returns whether it went out.
 */
export async function sendPush(target: Target, payload: PushPayload): Promise<boolean> {
  if (!pushConfigured()) return false;
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 4 * 60 * 60, urgency: "normal" }
    );
    return true;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await prisma.pushSubscription.deleteMany({ where: { id: target.id } });
      return false;
    }
    console.error("Push failed", status, error);
    return false;
  }
}

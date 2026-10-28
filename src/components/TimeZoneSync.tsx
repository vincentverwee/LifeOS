"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FALLBACK_TZ, TZ_COOKIE } from "@/lib/timeZone";
import { touchPushSubscription } from "@/lib/actions/push";

function readCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${TZ_COOKIE}=`))
    ?.slice(TZ_COOKIE.length + 1);
}

function dayIn(tz: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return null;
  }
}

/** Tells the server the browser's timezone (once, or after travelling). */
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const previous = readCookie();
    if (!tz || previous === tz) return;
    // IANA names ("Europe/Dublin") are valid cookie values as-is.
    document.cookie = `${TZ_COOKIE}=${tz}; path=/; max-age=31536000; samesite=lax`;
    // Push notifications are timed in the device's zone too (when "morning" is).
    void navigator.serviceWorker
      ?.getRegistration()
      .then((registration) => registration?.pushManager?.getSubscription())
      .then((subscription) => subscription && touchPushSubscription(subscription.endpoint, tz))
      .catch(() => {});
    // Re-render only when the server's "today" was actually wrong, and only if
    // the cookie stuck (blocked cookies would otherwise loop).
    if (readCookie() === tz && dayIn(previous ?? FALLBACK_TZ) !== dayIn(tz)) router.refresh();
  }, [router]);

  return null;
}

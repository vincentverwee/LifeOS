"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const KEY = "lifeos-launched";

/**
 * The home-screen app always opens on the hub. iOS starts a home-screen web app on the page it
 * was added from (it doesn't reliably use the manifest's start_url), so on the first page of a
 * launch we go to "/". sessionStorage lives as long as the app does: switching back to it or
 * pulling to refresh keeps the page; only a fresh launch starts over. The login page doesn't
 * count, so signing in on launch also lands on the hub.
 */
export function StandaloneStart() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Offline the hub can't load; stay on the (cached) page the app opened on.
    if (!standalone || pathname === "/login" || !navigator.onLine) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      return; // no storage: never redirect, or every page would bounce home
    }
    if (pathname !== "/") router.replace("/");
  }, [pathname, router]);

  return null;
}

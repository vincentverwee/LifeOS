"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { flushOutbox, readOutbox } from "@/lib/offline/outbox";

/**
 * Sends expenses saved offline (src/lib/offline/outbox.ts) once the app is online:
 * on load, when the connection comes back, when the app is reopened, and every 30 s
 * while it's open (iOS has no background sync, so the queue only goes while the app is open).
 */
export function OutboxSync() {
  const router = useRouter();

  useEffect(() => {
    async function sync() {
      if (!navigator.onLine || readOutbox().length === 0) return;
      if ((await flushOutbox()) > 0) router.refresh();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void sync();
    }
    void sync();
    // Phones often report "online" with no working connection, so no `online` event
    // comes when it really returns: also retry now and then while the app is in view.
    const retry = window.setInterval(() => {
      if (document.visibilityState === "visible") void sync();
    }, 30_000);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(retry);
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}

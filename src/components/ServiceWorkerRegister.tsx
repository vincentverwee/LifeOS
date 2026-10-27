"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js (offline screen + offline Add expense). Production only:
 * in development the chunks change on every edit and a cached page would get in the way.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      // Have the worker keep a fresh copy of the offline pages: tapping through the
      // app never loads them as a full page, which is the only thing it sees itself.
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.active?.postMessage("cache-offline-pages"))
      .catch(() => {
        // Unsupported or blocked: the app just works online-only.
      });
  }, []);

  return null;
}

// The "Studying …" notification while a study timer runs. Web apps can't use
// iOS Live Activities, so this is a plain notification (it doesn't count up),
// shown through the service worker: iOS only allows that in the Home Screen app
// (16.4+), and the worker is registered in production only. Everything here is
// best effort and silently does nothing where unsupported.

const TAG = "study-timer";

/**
 * Asks for permission. Call it straight from the tap, before any `await`:
 * iOS only shows the prompt inside a user gesture.
 */
export function askTimerNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return Promise.resolve(false);
  if (Notification.permission !== "default") return Promise.resolve(Notification.permission === "granted");
  return Notification.requestPermission()
    .then((result) => result === "granted")
    .catch(() => false);
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function showTimerNotification(codes: string[], startedAt: Date): Promise<void> {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await registration();
    if (!reg) return;
    const since = startedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    await reg.showNotification(codes.length ? `Studying ${codes.join(", ")}` : "Studying", {
      body: `Since ${since} · tap to stop the timer`,
      tag: TAG,
      icon: "/icon-192.png",
      data: { url: "/lessons/add" },
    });
  } catch {
    // unsupported: the timer works without it
  }
}

export async function clearTimerNotification(): Promise<void> {
  try {
    const reg = await registration();
    const open = (await reg?.getNotifications({ tag: TAG })) ?? [];
    open.forEach((n) => n.close());
  } catch {
    // nothing to clear
  }
}

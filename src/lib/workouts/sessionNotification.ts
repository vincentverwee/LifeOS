// The "Training …" notification while a live workout runs, like the study timer's
// (src/lib/lessons/timerNotification.ts): a plain notification through the service
// worker (Home Screen app on iOS 16.4+, production only), tapping it opens the session.
// Best effort: silently does nothing where unsupported.
export { askTimerNotificationPermission as askSessionNotificationPermission } from "@/lib/lessons/timerNotification";

const TAG = "workout-session";

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function showSessionNotification(activityName: string, startedAt: Date): Promise<void> {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await registration();
    if (!reg) return;
    const since = startedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    await reg.showNotification(`Training: ${activityName}`, {
      body: `Since ${since} · tap to open the session`,
      tag: TAG,
      icon: "/icon-192.png",
      data: { url: "/workouts/session" },
    });
  } catch {
    // unsupported: the session works without it
  }
}

export async function clearSessionNotification(): Promise<void> {
  try {
    const reg = await registration();
    const open = (await reg?.getNotifications({ tag: TAG })) ?? [];
    open.forEach((n) => n.close());
  } catch {
    // nothing to clear
  }
}

"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  setPushKinds,
  touchPushSubscription,
} from "@/lib/actions/push";
import { PUSH_KINDS, type PushKind } from "@/lib/push/kinds";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

type Device = { endpoint: string; kinds: PushKind[] };

type Status =
  | { kind: "checking" }
  | { kind: "unsupported" } // not the Home Screen app, or an old iOS
  | { kind: "no-worker" } // development: the service worker is production-only
  | { kind: "blocked" }
  | { kind: "ready"; endpoint: string | null }; // null = not subscribed here

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function detect(): Promise<Status> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
    return { kind: "unsupported" };
  }
  if (Notification.permission === "denied") return { kind: "blocked" };
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return { kind: "no-worker" };
  const subscription = await registration.pushManager.getSubscription();
  return { kind: "ready", endpoint: subscription?.endpoint ?? null };
}

export function NotificationSettings({ devices, publicKey }: { devices: Device[]; publicKey: string | null }) {
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    detect()
      .then(setStatus)
      .catch(() => setStatus({ kind: "unsupported" }));
  }, []);

  const endpoint = status.kind === "ready" ? status.endpoint : null;
  const device = endpoint ? devices.find((d) => d.endpoint === endpoint) : undefined;
  const others = devices.length - (device ? 1 : 0);

  // Keep this device's timezone current: it decides when "morning" is.
  useEffect(() => {
    if (device) void touchPushSubscription(device.endpoint, timeZone());
  }, [device]);

  function turnOn() {
    if (!publicKey) return;
    setError(null);
    setMessage(null);
    // Asked inside the tap, before any await: iOS only prompts from a user gesture.
    const permission = Notification.requestPermission();
    startTransition(async () => {
      if ((await permission) !== "granted") {
        setStatus({ kind: "blocked" });
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
        const json = subscription.toJSON();
        const result = await savePushSubscription({
          endpoint: subscription.endpoint,
          keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
          timeZone: timeZone(),
        });
        setStatus({ kind: "ready", endpoint: subscription.endpoint });
        if (result.ok) setMessage("On — a test notification is on its way.");
        else setError(result.error);
      } catch {
        setError("Couldn't subscribe this device. Try again from the Home Screen app.");
      }
    });
  }

  function turnOff() {
    if (!endpoint) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (await registration.pushManager.getSubscription())?.unsubscribe();
      } catch {
        // the server side is removed either way
      }
      await removePushSubscription(endpoint);
      setStatus({ kind: "ready", endpoint: null });
    });
  }

  function toggle(kind: PushKind, on: boolean) {
    if (!device) return;
    setError(null);
    const next = on ? [...device.kinds, kind] : device.kinds.filter((k) => k !== kind);
    startTransition(async () => {
      const result = await setPushKinds(device.endpoint, next);
      if (!result.ok) setError(result.error);
    });
  }

  if (status.kind === "checking") {
    return (
      <div className="flex justify-center py-8">
        <SheepSpinner size={28} />
      </div>
    );
  }

  const note = (text: string) => <p className="rounded-xl border border-border bg-surface p-4 text-sm text-ink-muted">{text}</p>;

  if (status.kind === "unsupported") {
    return note(
      "This browser can't get notifications. On iPhone, open LifeOS from the Home Screen (Share → Add to Home Screen, iOS 16.4 or newer) and come back here."
    );
  }
  if (status.kind === "no-worker") return note("Notifications only work in the deployed app, not in development.");
  if (status.kind === "blocked") {
    return note("Notifications are blocked for LifeOS. Allow them in the iPhone Settings → Notifications → LifeOS, then reopen this page.");
  }
  if (!publicKey) return note("Push isn't set up on the server yet (NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing).");

  return (
    <div className="flex flex-col gap-4">
      {device ? (
        <section className="rounded-xl border border-border bg-surface">
          <h2 className="px-4 pt-4 pb-1 font-medium text-foreground">On this device</h2>
          <ul>
            {PUSH_KINDS.map((k) => (
              <li key={k.key}>
                <label className="tap flex min-h-11 items-start gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={device.kinds.includes(k.key)}
                    disabled={pending}
                    onChange={(e) => toggle(k.key, e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="flex flex-col">
                    <span className="text-foreground">{k.label}</span>
                    <span className="text-sm text-ink-muted">{k.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <button
          type="button"
          onClick={turnOn}
          disabled={pending}
          className="btn btn-primary flex w-full px-4 py-3.5 text-base font-semibold"
        >
          {pending ? <SheepSpinner size={20} /> : "Turn on notifications"}
        </button>
      )}

      {message && <p className="text-sm text-positive-text">✓ {message}</p>}
      {error && <p className="text-sm text-critical">{error}</p>}

      <p className="text-sm text-ink-muted">
        Times are in this phone&apos;s timezone. Nothing is sent when there&apos;s nothing to say.
        {others > 0 && ` Also on ${others} other device${others > 1 ? "s" : ""}.`}
      </p>

      {device && (
        <button
          type="button"
          onClick={turnOff}
          disabled={pending}
          className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm"
        >
          Turn off on this device
        </button>
      )}
    </div>
  );
}

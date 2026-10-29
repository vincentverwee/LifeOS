"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  setPushKinds,
  setPushTime,
  touchPushSubscription,
} from "@/lib/actions/push";
import { defaultPushTime, isTimedPushKind, PUSH_KINDS, type PushKind, type PushTimes } from "@/lib/push/kinds";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { writeLocationMarker, type DeviceStatus } from "@/lib/push/device";

export type Device = {
  endpoint: string;
  kinds: PushKind[];
  times: PushTimes;
  /** When the server last handed each kind to the push service (ISO). */
  lastSent: Partial<Record<PushKind, string>>;
};

const timeInput = "rounded-lg border border-border bg-surface px-2 py-2 text-sm text-foreground";

/** "today 08:07", "yesterday 21:02", "Mon 27 Oct 08:15" in this phone's time. */
function describeSent(iso: string): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const day = (d: Date) => d.toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (day(at) === day(new Date())) return `today ${time}`;
  if (day(at) === day(yesterday)) return `yesterday ${time}`;
  return `${at.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function NotificationSettings({
  devices,
  publicKey,
  status,
  setStatus,
}: {
  devices: Device[];
  publicKey: string | null;
  status: DeviceStatus;
  setStatus: (status: DeviceStatus) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      writeLocationMarker(null); // the device's weather location went with it
      setStatus({ kind: "ready", endpoint: null });
    });
  }

  function changeTime(kind: PushKind, time: string) {
    if (!device || !time) return;
    setError(null);
    startTransition(async () => {
      const result = await setPushTime(device.endpoint, kind, time);
      if (!result.ok) setError(result.error);
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
            {PUSH_KINDS.map((k) => {
              const time = isTimedPushKind(k.key) ? (device.times[k.key] ?? defaultPushTime(k.key)) : null;
              return (
              <li key={k.key} className="flex items-start">
                <label className="tap flex min-h-11 flex-1 items-start gap-3 py-3 pl-4 pr-2">
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
                    {device.lastSent[k.key] && (
                      <span className="text-xs text-ink-muted">Last sent {describeSent(device.lastSent[k.key]!)}</span>
                    )}
                  </span>
                </label>
                {time && (
                  <input
                    type="time"
                    aria-label={`${k.label} time`}
                    // Re-mounted when the saved time changes, so the field shows what's stored.
                    key={time}
                    defaultValue={time}
                    disabled={pending || !device.kinds.includes(k.key)}
                    // On blur, not on change: iOS commits the wheel when it closes, desktop mid-typing.
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== time) changeTime(k.key, e.target.value);
                    }}
                    className={`${timeInput} mt-2 mr-4 shrink-0 disabled:opacity-50`}
                  />
                )}
              </li>
              );
            })}
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
        Times are in this phone&apos;s timezone; each goes out on the first check after its time (checks run
        every 15 minutes and can be a little late). Nothing is sent when there&apos;s nothing to say.
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

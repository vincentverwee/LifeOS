"use client";

import { useEffect, useState } from "react";
import { detectDevice, type DeviceStatus } from "@/lib/push/device";
import { NotificationSettings, type Device } from "@/components/settings/NotificationSettings";
import { WeatherLocation, type DeviceLocation } from "@/components/settings/WeatherLocation";

/** The per-device sections of /settings; both depend on this device's push subscription. */
export function DeviceSettings({
  devices,
  publicKey,
}: {
  devices: (Device & DeviceLocation)[];
  publicKey: string | null;
}) {
  const [status, setStatus] = useState<DeviceStatus>({ kind: "checking" });

  useEffect(() => {
    detectDevice()
      .then(setStatus)
      .catch(() => setStatus({ kind: "unsupported" }));
  }, []);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        <NotificationSettings devices={devices} publicKey={publicKey} status={status} setStatus={setStatus} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Weather location</h2>
        <WeatherLocation status={status} devices={devices} />
      </section>
    </>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPushKind, parsePushTimes, type PushKind } from "@/lib/push/kinds";
import { DeviceSettings } from "@/components/settings/DeviceSettings";

export default async function SettingsPage() {
  await connection();
  const [rows, sent] = await Promise.all([
    prisma.pushSubscription.findMany({
      select: { id: true, endpoint: true, kinds: true, times: true, placeLabel: true, locationSource: true },
    }),
    prisma.pushSent.findMany({ select: { key: true, sentAt: true }, orderBy: { sentAt: "asc" } }),
  ]);
  // Newest send per device and kind ("<sub>:<kind>:…" keys), so a missing one can be told apart from a late one.
  const lastSent = new Map<string, Partial<Record<PushKind, string>>>();
  for (const { key, sentAt } of sent) {
    const [subId, kind] = key.split(":");
    if (!isPushKind(kind)) continue;
    lastSent.set(subId, { ...lastSent.get(subId), [kind]: sentAt.toISOString() });
  }
  const devices = rows.map(({ id, times, ...r }) => ({
    ...r,
    kinds: r.kinds.filter(isPushKind),
    times: parsePushTimes(times),
    lastSent: lastSent.get(id) ?? {},
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Home
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Settings</h1>
      </div>
      <DeviceSettings devices={devices} publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Backup</h2>
        <p className="text-sm text-ink-muted">Everything you&apos;ve logged, as one JSON file.</p>
        {/* A plain link: the route sends it as an attachment. */}
        <a href="/api/export" download className="btn btn-outline inline-flex min-h-11 self-start px-5 text-sm font-semibold">
          Download everything
        </a>
      </section>
    </div>
  );
}

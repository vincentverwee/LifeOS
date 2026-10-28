import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPushKind } from "@/lib/push/kinds";
import { DeviceSettings } from "@/components/settings/DeviceSettings";

export default async function SettingsPage() {
  await connection();
  const rows = await prisma.pushSubscription.findMany({
    select: { endpoint: true, kinds: true, placeLabel: true, locationSource: true },
  });
  const devices = rows.map((r) => ({ ...r, kinds: r.kinds.filter(isPushKind) }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Home
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Settings</h1>
      </div>
      <DeviceSettings devices={devices} publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
    </div>
  );
}

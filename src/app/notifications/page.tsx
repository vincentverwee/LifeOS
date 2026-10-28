import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPushKind } from "@/lib/push/kinds";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

export default async function NotificationsPage() {
  await connection();
  const rows = await prisma.pushSubscription.findMany({ select: { endpoint: true, kinds: true } });
  const devices = rows.map((r) => ({ endpoint: r.endpoint, kinds: r.kinds.filter(isPushKind) }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Home
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Notifications</h1>
      </div>
      <NotificationSettings devices={devices} publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} />
    </div>
  );
}

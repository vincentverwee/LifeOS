import { timingSafeEqual } from "node:crypto";
import { runPushSchedule } from "@/lib/push/schedule";
import { refreshPricesIfStale } from "@/lib/data/investPrices";
import { refreshInflationIfStale } from "@/lib/data/inflation";

/**
 * Sends the push notifications that are due. Called every 15 minutes by
 * .github/workflows/push-cron.yml with `Authorization: Bearer $CRON_SECRET`
 * (excluded from the passcode proxy, so the secret is the only gate). Also refreshes
 * Investments' fund prices when they're over 6 h old and the inflation index once a day;
 * a failure there never stops push.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const [push, prices, inflation] = await Promise.all([
    runPushSchedule(),
    refreshPricesIfStale().catch((e) => {
      console.error("[invest] price refresh failed", e);
      return { error: "price refresh failed" };
    }),
    refreshInflationIfStale().catch((e) => {
      console.error("[invest] inflation refresh failed", e);
      return { error: "inflation refresh failed" };
    }),
  ]);
  return Response.json({ ...push, prices, inflation });
}

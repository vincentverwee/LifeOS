import { timingSafeEqual } from "node:crypto";
import { runPushSchedule } from "@/lib/push/schedule";

/**
 * Sends the push notifications that are due. Called every 15 minutes by
 * .github/workflows/push-cron.yml with `Authorization: Bearer $CRON_SECRET`
 * (excluded from the passcode proxy, so the secret is the only gate).
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runPushSchedule());
}

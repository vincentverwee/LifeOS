import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push/send";
import { partnerName } from "@/lib/data/partner";

// Called by the other deployment (see PARTNER_* in CLAUDE.md); outside the passcode
// proxy, so the shared secret is the only gate.
function authorized(request: Request): boolean {
  const secret = process.env.PARTNER_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return !!secret && given.length === expected.length && timingSafeEqual(given, expected);
}

/** Is this site's study timer running? Tracked-only timers (countsAsStudy off) don't count. */
export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const timer = await prisma.studyTimer.findUnique({ where: { id: "current" } });
  if (!timer) return Response.json({ studying: false });
  const courses = await prisma.studyCourse.findMany({
    where: { id: { in: timer.courseIds } },
    select: { name: true, countsAsStudy: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  if (courses.length && !courses.some((c) => c.countsAsStudy)) return Response.json({ studying: false });
  return Response.json({ studying: true, startedAt: timer.startedAt.toISOString(), courses: courses.map((c) => c.name) });
}

/** The partner started studying: push to every device here that has "partner-study" on. */
export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const name = partnerName();
  if (!name) return new Response("Partner not configured", { status: 404 });
  const body = (await request.json().catch(() => null)) as { startedAt?: unknown; courses?: unknown } | null;
  const startedAt = typeof body?.startedAt === "string" ? new Date(body.startedAt) : null;
  const courses = body?.courses;
  if (
    !startedAt ||
    Number.isNaN(startedAt.getTime()) ||
    !Array.isArray(courses) ||
    courses.length > 10 ||
    !courses.every((c) => typeof c === "string" && c.length <= 60)
  ) {
    return new Response("Bad request", { status: 400 });
  }

  const payload = { title: `${name} started studying`, body: courses.join(", ") || "Studying", url: "/lessons", tag: "partner-study" };
  const subs = await prisma.pushSubscription.findMany({ where: { kinds: { has: "partner-study" } } });
  const sent: string[] = [];
  for (const sub of subs) {
    // Claimed first, like the scheduler: a retried POST never pushes twice.
    const key = `${sub.id}:partner-study:${startedAt.toISOString()}`;
    try {
      await prisma.pushSent.create({ data: { key } });
    } catch {
      continue;
    }
    if (await sendPush(sub, payload)) sent.push(key);
    else await prisma.pushSent.deleteMany({ where: { key } });
  }
  return Response.json({ devices: subs.length, sent });
}

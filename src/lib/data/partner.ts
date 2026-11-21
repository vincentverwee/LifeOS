import "server-only";

// The other deployment (the cat site from the user's, and back). Off unless all three are set.
function partner() {
  const url = process.env.PARTNER_URL;
  const secret = process.env.PARTNER_SECRET;
  const name = process.env.PARTNER_NAME;
  return url && secret && name ? { url: url.replace(/\/$/, ""), secret, name } : null;
}

export function partnerName(): string | null {
  return partner()?.name ?? null;
}

export type PartnerStudy = { name: string; startedAt: string; courses: string[] };

/** The partner's running study timer, or null (not studying, off, or their site didn't answer in 2 s). */
export async function getPartnerStudy(): Promise<PartnerStudy | null> {
  const p = partner();
  if (!p) return null;
  try {
    const res = await fetch(`${p.url}/api/partner/study`, {
      headers: { Authorization: `Bearer ${p.secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { studying?: boolean; startedAt?: unknown; courses?: unknown };
    if (!data.studying || typeof data.startedAt !== "string" || !Array.isArray(data.courses)) return null;
    return { name: p.name, startedAt: data.startedAt, courses: data.courses.filter((c): c is string => typeof c === "string") };
  } catch {
    return null;
  }
}

/** Tells the partner's site this timer started, so it can push to their phone. */
export async function notifyPartnerStudying(startedAt: Date, courses: string[]): Promise<void> {
  const p = partner();
  if (!p) return;
  try {
    const res = await fetch(`${p.url}/api/partner/study`, {
      method: "POST",
      headers: { Authorization: `Bearer ${p.secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startedAt: startedAt.toISOString(), courses }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("[partner] notify failed", res.status);
  } catch (error) {
    console.error("[partner] notify failed", error);
  }
}

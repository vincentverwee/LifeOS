"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, AUTH_MAX_AGE_S, createToken, safeEqual } from "@/lib/authToken";

export type LoginState = {
  error: string;
  /** counts failures, so the form shakes again on every wrong passcode */
  attempt: number;
  /** seconds until the next try is allowed */
  retryAfter?: number;
} | null;

/** Only same-site paths, so ?next= can't bounce to another domain. */
function safeNext(next: FormDataEntryValue | null): string {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

// A passcode is only 10^4–10^8 combinations, so wrong tries are throttled in the
// database (one row; it must hold across serverless instances): 5 free tries, then
// one try per lock period, 30 s doubling up to 15 min. A correct passcode resets it.
const THROTTLE_ID = "global";
const FREE_TRIES = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;

const lockFor = (failures: number) =>
  Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** Math.max(0, failures - FREE_TRIES));
const secondsUntil = (date: Date) => Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  const attempt = (prev?.attempt ?? 0) + 1;
  const expected = process.env.APP_PASSWORD;
  if (!expected || !/^\d{4,8}$/.test(expected)) {
    return { error: "The passcode isn't configured on the server (APP_PASSWORD, 4–8 digits).", attempt };
  }

  // Count the try before checking it, atomically: a burst of parallel guesses each
  // gets its own number, so only the first few are ever compared.
  const row = await prisma.loginThrottle.upsert({
    where: { id: THROTTLE_ID },
    create: { id: THROTTLE_ID, failures: 1 },
    update: { failures: { increment: 1 } },
  });
  const now = new Date();

  if (row.lockedUntil && row.lockedUntil > now) {
    return { error: "Too many wrong passcodes.", attempt, retryAfter: secondsUntil(row.lockedUntil) };
  }
  if (row.failures > FREE_TRIES) {
    // Past the free tries, one try per lock period: claim it by moving the lock
    // forward first. A parallel request that loses the claim is refused.
    const lockedUntil = new Date(now.getTime() + lockFor(row.failures));
    const { count } = await prisma.loginThrottle.updateMany({
      where: { id: THROTTLE_ID, lockedUntil: row.lockedUntil ?? { equals: null } },
      data: { lockedUntil },
    });
    if (count === 0 || !row.lockedUntil) {
      return { error: "Too many wrong passcodes.", attempt, retryAfter: Math.ceil(BASE_LOCK_MS / 1000) };
    }
  }

  const passcode = String(formData.get("passcode") ?? "");
  if (!/^\d+$/.test(passcode) || !safeEqual(passcode, expected)) {
    if (row.failures === FREE_TRIES) {
      const lockedUntil = new Date(now.getTime() + BASE_LOCK_MS);
      await prisma.loginThrottle.update({ where: { id: THROTTLE_ID }, data: { lockedUntil } });
      return { error: "Too many wrong passcodes.", attempt, retryAfter: secondsUntil(lockedUntil) };
    }
    const fresh = await prisma.loginThrottle.findUnique({ where: { id: THROTTLE_ID } });
    return fresh?.lockedUntil && fresh.lockedUntil > new Date()
      ? { error: "Wrong passcode.", attempt, retryAfter: secondsUntil(fresh.lockedUntil) }
      : { error: "Wrong passcode.", attempt };
  }

  await prisma.loginThrottle.deleteMany({ where: { id: THROTTLE_ID } });
  (await cookies()).set(AUTH_COOKIE, await createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE_S,
  });
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}

import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authDisabled, verifyToken } from "@/lib/authToken";

export async function isAuthed(): Promise<boolean> {
  if (authDisabled()) return true;
  return verifyToken((await cookies()).get(AUTH_COOKIE)?.value);
}

/**
 * First line of every server action: the proxy only gates page requests,
 * actions can be POSTed to directly.
 */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthed())) throw new Error("Not logged in.");
}

// Signed session token for the single-user password gate. Pure Web Crypto so it
// runs in the proxy as well as in server code. Token = "<expiresMs>.<hmac>".

export const AUTH_COOKIE = "lifeos_auth";
export const AUTH_MAX_AGE_S = 60 * 60 * 24 * 180; // ~6 months: the PWA stays logged in

/** Auth is off only when no password is configured outside production (local dev). */
export function authDisabled(): boolean {
  return !process.env.APP_PASSWORD && process.env.NODE_ENV !== "production";
}

function secret(): string {
  // AUTH_SECRET signs the cookie; falling back to the password still keeps tokens
  // unforgeable, and changing the password then logs every device out.
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || "";
}

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

/** Compares without bailing at the first differing character. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function createToken(): Promise<string> {
  const expires = String(Date.now() + AUTH_MAX_AGE_S * 1000);
  return `${expires}.${await sign(expires)}`;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token || !secret()) return false;
  const [expires, mac] = token.split(".");
  if (!expires || !mac || !(Number(expires) > Date.now())) return false;
  return safeEqual(mac, await sign(expires));
}

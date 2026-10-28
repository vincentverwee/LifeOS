import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authDisabled, verifyToken } from "@/lib/authToken";

// Password gate: every page needs a valid session cookie, except /login itself.
// Server actions check again with requireAuth() (src/lib/auth.ts).
export async function proxy(request: NextRequest) {
  if (authDisabled()) return NextResponse.next();
  if (await verifyToken(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  // Action POSTs and route handlers get a plain 401 instead of an HTML redirect.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse("Not logged in.", { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except /login, Next internals and the PWA/static assets (incl. the
    // service worker and its offline page, which must load without a session).
    // /api/push/cron checks its own secret (it's called by a scheduler, not a browser).
    "/((?!login|api/push/cron|_next/static|_next/image|favicon\\.ico|icon|apple-icon|manifest\\.webmanifest|sw\\.js|offline\\.html|.*\\.(?:png|svg|ico|jpg|webp)$).*)",
  ],
};

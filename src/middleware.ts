import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

// MAP ROUTE → ALLOWED ACCESS LEVELS
const accessRules: Record<string, ("guest" | "user" | "admin" | "moderator")[]> = {
  "/dashboard": ["admin", "moderator"],
  "/profile": ["user", "admin", "moderator"],
  "/community": ["user", "admin", "moderator"],
  "/feedback": ["user", "admin", "moderator"],
  "/iQr": ["admin", "moderator", "user"],
  "/iReader": ["admin", "moderator"],
  "/announcement": ["user", "admin", "moderator", "guest"],
  "/admin": ["admin"], // Keep admin-only
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  const payload = await decrypt(session);
  let normalizedRole: "guest" | "user" | "admin" | "moderator" = "guest";

  if (payload?.role) {
    normalizedRole = payload.role;
  }

  for (const route in accessRules) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const allowed = accessRules[route];

      if (!allowed.includes(normalizedRole)) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

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
  console.log(`[Middleware] Processing: ${pathname}`);

  // 1. Check for Session Cookie
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  console.log(`[Middleware] Session cookie found: ${!!session}`);

  const payload = await decrypt(session);
  let normalizedRole: "guest" | "user" | "admin" | "moderator" = "guest";

  if (payload?.role) {
    normalizedRole = payload.role;
  }
  console.log(`[Middleware] Role determined: ${normalizedRole}`);

  // 2. Check Access Rules
  for (const route in accessRules) {
    // Exact match OR sub-path match (e.g. /dashboard/settings)
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const allowed = accessRules[route];
      console.log(`[Middleware] Route ${pathname} matches rule for ${route}. Allowed roles: ${allowed.join(", ")}`);

      if (!allowed.includes(normalizedRole)) {
        console.log(`[Middleware] ⛔ Access Denied: ${pathname} for ${normalizedRole}`);
        const url = req.nextUrl.clone();
        url.pathname = "/"; // Redirect home or login
        return NextResponse.redirect(url);
      } else {
        console.log(`[Middleware] ✅ Access Granted for ${pathname}`);
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

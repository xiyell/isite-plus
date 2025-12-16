import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";

// MAP ROUTE → ALLOWED ACCESS LEVELS
const accessRules: Record<string, ("guest" | "user" | "admin")[]> = {
  "/dashboard": ["admin"],
  "/profile": ["user", "admin"],
  "/community": ["user", "admin"],
  "/feedback": ["user", "admin"],
  "/iQr": ["user", "admin"],
  "/iReader": ["user", "admin"],
  "/announcement": ["user", "admin"],
  "/admin": ["admin"],
};

export async function middleware(req: NextRequest) {
  return NextResponse.next();

  // const { pathname } = req.nextUrl;
  // console.log("🔒 Middleware Active:", pathname);

  // // 1. Check for Session Cookie
  // const cookieStore = await cookies();
  // const session = cookieStore.get("session")?.value;
  // console.log(`🔒 Middleware Probe: Session Cookie Present? ${!!session}`);
  // if (session) {
  //   console.log(`🔒 Middleware Probe: Session Cookie Length: ${session.length}`);
  // }

  // const payload = await decrypt(session);

  // let normalizedRole: "guest" | "user" | "admin" = "guest";

  // if (payload?.role) {
  //   normalizedRole = payload.role;
  //   console.log(`🔒 Middleware Probe: Decrypted Role: ${normalizedRole}`);
  // } else {
  //   console.log("🔒 Middleware Probe: Decryption resulted in no role/payload");
  // }

  // // Debug log for role
  // console.log(`🔒 Middleware Check: ${pathname} | Role: ${normalizedRole}`);

  // // 2. Check Access Rules
  // for (const route in accessRules) {
  //   // Exact match OR sub-path match (e.g. /dashboard/settings)
  //   if (pathname === route || pathname.startsWith(`${route}/`)) {
  //     const allowed = accessRules[route];

  //     if (!allowed.includes(normalizedRole)) {
  //       console.log(`⛔ Access Denied: ${pathname} for ${normalizedRole}`);
  //       const url = req.nextUrl.clone();
  //       url.pathname = "/"; // Redirect home
  //       return NextResponse.redirect(url);
  //     }
  //   }
  // }

  // return NextResponse.next();
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

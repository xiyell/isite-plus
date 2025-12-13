import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// MAP ROUTE → ALLOWED ACCESS LEVELS
const accessRules: Record<string, ("guest" | "user" | "admin")[]> = {
  "/": ["guest", "user", "admin"],

  // User-level pages
  "/dashboard": ["user", "admin"],
  "/profile": ["user", "admin"],
  "/community": ["user", "admin"],
  "/feedback": ["user", "admin"],
  "/iQr": ["user", "admin"],
  "/iReader": ["user", "admin"],
  "/announcement": ["user", "admin"],

  // Admin-only
  "/admin": ["admin"],
};

// Classify Firestore roles into levels
function normalizeRole(role: string): "guest" | "user" | "admin" {
  if (!role) return "guest";

  if (role === "admin") return "admin";

  // Any logged-in non-admin role is "user"
  return "user";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read cookie
  const rawRole = req.cookies.get("userRole")?.value ?? "";
  const normalizedRole = normalizeRole(rawRole);

  for (const route in accessRules) {
    if (pathname.startsWith(route)) {
      const allowed = accessRules[route];

      if (!allowed.includes(normalizedRole)) {
        const url = req.nextUrl.clone();
        url.pathname = "/"; // Redirect home
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/community/:path*",
    "/feedback/:path*",
    "/admin/:path*",
    "/iQr/:path*",
    "/iReader/:path*",
    "/announcement/:path*",
  ],
};

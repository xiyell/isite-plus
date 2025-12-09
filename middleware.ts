import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const token = req.cookies.get("token")?.value; // client must send token

    // Simple check for token existence. 
    // functionality relying on firebase-admin (Node.js only) cannot run in Edge Middleware.
    // Deep verification should happen in the component or API route.
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

// Apply middleware to dashboard routes
export const config = {
    matcher: ["/dashboard/:path*"],
};

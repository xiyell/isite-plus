import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/services/firebaseAdmin";
import { encrypt } from "@/lib/session";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

        // Verify token with Firebase Admin
        const decodedToken = await getAdminAuth().verifyIdToken(token);
        const uid = decodedToken.uid;

        if (!decodedToken.email_verified) {
             return NextResponse.json({ error: "Email not verified. Please check your inbox/junk folder." }, { status: 403 });
        }

        // Get role from Firestore
        const db = getAdminDb();
        const userDoc = await db.collection("users").doc(uid).get();
        const role = userDoc.data()?.role || "user";

        // Create JWT session manually
        const { encrypt } = await import("@/lib/session");
        const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
        const expiresAt = new Date(Date.now() + maxAge * 1000);
        const session = await encrypt({ uid, role: role as any, expiresAt });

        const response = NextResponse.json({ success: true, role }, { status: 200 });

        const isProd = process.env.NODE_ENV === "production";
        const cookieOptions = {
            httpOnly: true,
            secure: isProd,
            sameSite: "lax" as const,
            path: "/",
            maxAge: maxAge,
            expires: expiresAt
        };

        // Set secure session cookie
        response.cookies.set("session", session, cookieOptions);

        const uiRoleToken = await encrypt({ role } as any);
        response.cookies.set("ui_role", uiRoleToken, cookieOptions);

        // Clear legacy cookies to ensure a fresh start
        response.cookies.delete("admin");
        response.cookies.delete("userRole");

        console.log(`✅ Login prepared | UID: ${uid} | Role: ${role}`);

        return response;
    }catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: (error as any)?.message || "Internal server error" }, { status: 500 });
}

}

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

        // Get role from Firestore
        const db = getAdminDb();
        const userDoc = await db.collection("users").doc(uid).get();
        const role = userDoc.data()?.role || "user";

        // Create JWT session
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const session = await encrypt({ uid, role, expiresAt });

        const isProd = process.env.NODE_ENV === "production";

        // Attach cookies to the response
        const res = NextResponse.json({ success: true, role });
        res.cookies.set("session", session, {
            httpOnly: true,
            secure: isProd,  // false on localhost
            sameSite: "lax",
            path: "/",
            expires: expiresAt,
        });
        res.cookies.set("ui_role", role, {
            httpOnly: false,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            expires: expiresAt,
        });

        console.log(`✅ Login success | UID: ${uid} | Role: ${role}`);
        return res;
    }catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: (error as any)?.message || "Internal server error" }, { status: 500 });
}

}

import { NextResponse } from "next/server";
import { getAdminAuth } from "@/services/firebaseAdmin";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        // Verify the token with Firebase Admin
        const decodedToken = await getAdminAuth().verifyIdToken(token);

        // Check for admin role (adjust this logic if you use a different claim or email check)
        // For example: if (decodedToken.email === "admin@example.com")
        // OR checking a custom claim: if (decodedToken.role === 'admin')

        // Check for admin role
        const isAdmin = decodedToken.role === 'admin';

        if (isAdmin) {
            const cookieStore = cookies();
            cookieStore.set("admin", "true", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: 60 * 60 * 24, // 1 day
            });
        }

        return NextResponse.json({ success: true, role: isAdmin ? 'admin' : 'user' });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { uid, secret } = await req.json();
        const adminSecret = process.env.ADMIN_SETUP_SECRET;

        // Ensure env var is set
        if (!adminSecret) {
            console.error("❌ ADMIN_SETUP_SECRET is not set in environment variables");
            return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
        }

        // Simple protection to prevent accidental public use if deployed
        if (secret !== adminSecret) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (!uid) {
            return NextResponse.json({ error: "Missing UID" }, { status: 400 });
        }

        const db = getAdminDb();
        await db.collection("users").doc(uid).update({
            role: "admin"
        });

        return NextResponse.json({ success: true, message: `User ${uid} promoted to admin.` });
    } catch (error) {
        console.error("Promotion error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

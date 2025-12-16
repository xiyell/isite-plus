import { NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { uid, secret } = await req.json();

        // Simple protection to prevent accidental public use if deployed
        if (secret !== "make-me-admin-please") {
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

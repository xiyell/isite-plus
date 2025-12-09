import { NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";

export async function GET() {
    try {
        const db = getAdminDb();
        const snapshot = await db.collection("users").limit(50).get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        // Return empty array instead of 500/crash to stop dashboard JSON error
        return NextResponse.json([]);
    }
}

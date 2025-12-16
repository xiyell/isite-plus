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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { uid, email, studentId, role, name, provider } = body;

        console.log("Creating user:", { uid, email, role });

        if (!uid || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const db = getAdminDb();

        // Create/Update user document
        // We use set with merge: true to avoid overwriting if it exists, 
        // but typically this is called on fresh signup.
        await db.collection("users").doc(uid).set({
            uid,
            email,
            studentId: studentId || null,
            role: role || "user", // FORCE DEFAULT TO USER if not provided
            name: name || email.split("@")[0],
            provider: provider || "password",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log(`User ${uid} created with role ${role || "user"}`);

        return NextResponse.json({ success: true, message: "User created successfully" });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

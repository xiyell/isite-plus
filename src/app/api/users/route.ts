import { NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { requireAdmin } from "@/lib/auth-checks";

export async function GET() {
    try {
        await requireAdmin(); // Enforce Admin Access

        const db = getAdminDb();
        const snapshot = await db.collection("users").limit(50).get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        // Return 403/401 if auth failed, or 500 otherwise
        if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("Forbidden"))) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json([]);
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { uid, email, studentId, name, provider } = body;

        console.log("Creating user:", { uid, email });

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
            role: "user", // FORCE DEFAULT TO USER. Admins must be promoted manually or via secure setup.
            name: name || email.split("@")[0],
            provider: provider || "password",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log(`User ${uid} created with role 'user'`);

        return NextResponse.json({ success: true, message: "User created successfully" });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

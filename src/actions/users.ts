"use server";

import { getAdminDb } from "@/services/firebaseAdmin";
import { getSession } from "@/lib/session";

export async function getUsers() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            throw new Error("Unauthorized");
        }

        const db = getAdminDb();
        const snapshot = await db.collection("users").limit(100).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

export async function createUser(data: { uid: string, email: string, studentId?: string, name?: string, provider?: string }) {
    try {
        const { uid, email, studentId, name, provider } = data;

        if (!uid || !email) {
            throw new Error("Missing required fields");
        }

        const db = getAdminDb();

        await db.collection("users").doc(uid).set({
            uid,
            email,
            studentId: studentId || null,
            role: "user",
            name: name || email.split("@")[0],
            provider: provider || "password",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
            active: true
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error creating user:", error);
        throw new Error(error.message || "Failed to create user");
    }
}

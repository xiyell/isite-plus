import { decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function getSession() {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) return null;
    return await decrypt(session);
}

export async function requireAuth() {
    const session = await getSession();
    if (!session) {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function requireAdmin() {
    const session = await requireAuth();
    if (session.role !== "admin") {
        throw new Error("Forbidden: Admin access required");
    }
    return session;
}

export async function requireModerator() {
    const session = await requireAuth();
    if (session.role !== "admin" && session.role !== "moderator") {
        throw new Error("Forbidden: Moderator or Admin access required");
    }
    return session;
}

export function handleAuthError(error: unknown) {
    console.error("Auth Error:", error);
    if (error instanceof Error) {
        if (error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (error.message.startsWith("Forbidden")) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

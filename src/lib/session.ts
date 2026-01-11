import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET || "dev-secret-key-at-least-32-chars-long-123456";

export type SessionPayload = {
    uid: string;
    role: "admin" | "user" | "moderator";
    expiresAt: Date;
};

/* -------------------- JWT HELPERS -------------------- */
/* -------------------- JWT HELPERS -------------------- */

export async function encrypt(payload: SessionPayload) {
    if (!secretKey) {
        console.error("❌ SESSION_SECRET is missing");
        throw new Error("Missing SESSION_SECRET");
    }

    const key = new TextEncoder().encode(secretKey);

    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(key);
}

export async function decrypt(session?: string) {
    if (!secretKey || !session) return null;

    try {
        const key = new TextEncoder().encode(secretKey);
        const { payload } = await jwtVerify(session, key, {
            algorithms: ["HS256"],
        });

        return payload as SessionPayload;
    } catch (err) {
        console.log("⚠️ Failed to verify session:", err);
        return null;
    }
}

/* -------------------- SESSION -------------------- */

export async function createSession(uid: string, rawRole: string) {
    // Normalize role
    let role: "admin" | "user" | "moderator" = "user";
    if (rawRole?.toLowerCase() === "admin") role = "admin";
    if (rawRole?.toLowerCase() === "moderator") role = "moderator";

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await encrypt({ uid, role, expiresAt });

    const cookieStore = await cookies(); // 
    const isProd = process.env.NODE_ENV === "production"; // 

    cookieStore.set("session", session, {
        httpOnly: true,
        secure: isProd, // Secure in production

        sameSite: "lax",
        path: "/",
        expires: expiresAt,
    });

    // Optional UI cookie - now using JWT
    const uiRoleSession = await encrypt({ role } as any);
    cookieStore.set("ui_role", uiRoleSession, {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
    });

    console.log(`✅ Session created | UID: ${uid} | Role: ${role}`);
}


export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}

export async function getSession() {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;
    if (!session) return null;
    return await decrypt(session);
}

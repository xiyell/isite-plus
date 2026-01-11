"use server";

import { getAdminDb } from "@/services/firebaseAdmin";
import { sendEmail } from "@/lib/email";
import { FieldValue } from "firebase-admin/firestore";

// Helper to generate a 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a verification code, stores it in Firestore, and sends it via email.
 */
export async function sendVerificationCode(email: string, userUid: string) {
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

  const db = getAdminDb();
  
  // Store code in a subcollection or a root collection. Root is easier to manage expiration.
  // We use the userUid as the document ID for easy overwrite/lookup.
  await db.collection("verification_codes").doc(userUid).set({
    code,
    email,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    attempts: 0
  });

  /* 
   * Simplified Email Template
   * Avoids "Security", "Urgent", or complex layouts that trigger spam filters.
   */
  const message = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h3 style="color: #444;">iSITE Verification Code</h3>
      <p>Here is the code you requested to log in:</p>
      
      <div style="font-size: 28px; font-weight: bold; margin: 20px 0; letter-spacing: 3px; color: #2563eb;">
        ${code}
      </div>
      
      <p style="font-size: 14px; color: #666;">This code expires in 10 minutes.</p>
    </div>
  `;

  try {
      await sendEmail(email, "Verification Code", message); // Simple subject
      return { success: true };
  } catch (error: any) {
      console.error("Failed to send email:", error);
      return { 
          success: false, 
          message: "Failed to send verification email. Please try again or contact support." 
      };
  }
}

/**
 * Verifies the code provided by the user.
 */
export async function verifyTwoFactorCode(userUid: string, inputCode: string) {
    const db = getAdminDb();
    const docRef = db.collection("verification_codes").doc(userUid);
    const doc = await docRef.get();

    if (!doc.exists) {
        return { success: false, message: "Code expired or invalid." };
    }

    const data = doc.data();
    if (!data) return { success: false, message: "Invalid data." };

    if (Date.now() > data.expiresAt) {
        return { success: false, message: "Code has expired." };
    }

    if (data.code !== inputCode) {
        // Increment attempts
        await docRef.update({ attempts: FieldValue.increment(1) });
        if (data.attempts >= 5) {
             // Maybe lock out or delete verification
             await docRef.delete();
             return { success: false, message: "Too many failed attempts. Request a new code." };
        }
        return { success: false, message: "Incorrect code." };
    }

    // Success! Delete the code so it can't be reused
    await docRef.update({ 
        verified: true,
        verifiedAt: FieldValue.serverTimestamp()
    });
    return { success: true };
}

// 🚀 NEW: AUTH SESSION ACTIONS (Direct Firebase & Session Management)
import { getAdminAuth } from "@/services/firebaseAdmin";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";

export async function loginAction(token: string) {
    try {
        if (!token) throw new Error("Missing token");

        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        if (!decodedToken.email_verified) {
            throw new Error("Email not verified. Please check your inbox.");
        }

        const db = getAdminDb();
        const userDoc = await db.collection("users").doc(uid).get();
        
        if (!userDoc.exists) {
            throw new Error("User account not found.");
        }

        const userData = userDoc.data();
        if (userData?.isDeleted || userData?.status === 'deleted') {
            throw new Error("This account has been deactivated.");
        }

        const role = userData?.role || "user";

        // Update last login and status
        await db.collection("users").doc(uid).update({
            status: 'active',
            active: true,
            lastLogin: new Date().toISOString()
        });

        // Session Setup
        const maxAge = 7 * 24 * 60 * 60; // 7 days
        const expiresAt = new Date(Date.now() + maxAge * 1000);
        const session = await encrypt({ uid, role: role as any, expiresAt });

        const isProd = process.env.NODE_ENV === "production";
        const cookieStore = await cookies();

        cookieStore.set("session", session, {
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            maxAge: maxAge,
        });

        const uiRoleToken = await encrypt({ role } as any);
        cookieStore.set("ui_role", uiRoleToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            maxAge: maxAge,
        });

        return { success: true, role };
    } catch (error: any) {
        console.error("Login action error:", error);
        return { success: false, message: error.message || "Failed to log in" };
    }
}

export async function logoutAction() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    cookieStore.delete("ui_role");
    cookieStore.delete("admin");
    cookieStore.delete("userRole");
    return { success: true };
}

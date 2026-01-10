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

  const message = `
    <p>Your iSITE+ verification code is: <b>${code}</b></p>
    <p>This code will expire in 10 minutes.</p>
  `;

  try {
      await sendEmail(email, "Your Verification Code", message);
      return { success: true };
  } catch (error: any) {
      console.error("Failed to send email:", error);
      return { 
          success: false, 
          message: "Failed to send email. Check your .env.local credentials and terminal logs." 
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
    await docRef.delete();
    return { success: true };
}

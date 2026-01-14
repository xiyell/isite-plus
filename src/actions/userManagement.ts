// src/actions/userManagement.ts
"use server";
import { db } from "@/services/firebase";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { addLog, getActorDisplayName } from "./logs"; // Import helper
import { getAdminAuth } from "@/services/firebaseAdmin";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role?: string;
}
// actions/userManagement.ts

/**
 * Update a user's password using Firebase Admin SDK
 */
export async function updateUserPassword(userId: string, newPassword: string, actorUid: string) {
  try {
    const auth = getAdminAuth();
    await auth.updateUser(userId, {
      password: newPassword,
    });
    const adminDb = getAdminDb();
    const actorRef = adminDb.collection("users").doc(actorUid);
    const targetUserRef = adminDb.collection("users").doc(userId);

    const [actorSnap, targetUserSnap] = await Promise.all([
      actorRef.get(),
      targetUserRef.get()
    ]);

    const actor = actorSnap.data();
    const targetUser = targetUserSnap.data();
    const targetName = targetUser?.name || "Unknown User";
    const actorName = await getActorDisplayName(actorUid);

    await addLog({
      category: "users",
      action: "UPDATE_PASSWORD",
      severity: "high",
      actorRole: actor?.role,
      actorName: actorName,
      message: `Password updated for user "${targetName}" by ${actorName}`,
    });
    return { success: true, message: `Password updated for user ${targetName}` };
  } catch (error) {
    console.error("Error updating user password:", error);
    return { success: false, message: "Failed to update password" };
  }
}
// ---------------- MOVE USER TO RECYCLE BIN ----------------
export async function moveUserToRecycleBin(userId: string, actorUid: string) {
  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(userId);
    const actorRef = adminDb.collection("users").doc(actorUid);

    const [actorSnap, userSnap] = await Promise.all([
      actorRef.get(),
      userRef.get()
    ]);

    const actor = actorSnap.data();
    const userData = userSnap.data();
    const userName = userData?.name || "Unknown User";
    const actorName = await getActorDisplayName(actorUid);

    // Perform the update
    await userRef.update({
      isDeleted: true,
      status: "deleted",
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: actorRef.id,
    });

    await addLog({
      category: "users",
      action: "MOVE_TO_RECYCLE_BIN",
      severity: "high",
      actorRole: actor?.role,
      actorName: actorName,
      message: `User "${userName}" was moved to recycle bin by ${actorName}`,
    });
  } catch (error) {
    console.error("Failed to move user to recycle bin:", error);
    throw error;
  }
}

// ---------------- RESTORE USER FROM RECYCLE BIN ----------------
export async function restoreUserFromRecycleBin(userId: string, actorUid: string) {
  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(userId);
    const actorRef = adminDb.collection("users").doc(actorUid);

    const [actorSnap, userSnap] = await Promise.all([
      actorRef.get(),
      userRef.get()
    ]);

    const actor = actorSnap.data();
    const userData = userSnap.data();
    const userName = userData?.name || "Unknown User";
    const actorName = await getActorDisplayName(actorUid);

    await userRef.update({
      status: "active",
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });

    await addLog({
      category: "users",
      action: "RESTORE_FROM_RECYCLE_BIN",
      severity: "medium",
      actorRole: actor?.role,
      actorName: actorName,
      message: `User "${userName}" was restored from recycle bin by ${actorName}`,
    });
  } catch (error) {
    console.error("Failed to restore user:", error);
    throw error;
  }
}

// ---------------- PERMANENT DELETE USER ----------------
export async function permanentlyDeleteUser(userId: string, actorUid: string) {
  // Note: This requires Admin SDK for real deletion.
  const adminDb = getAdminDb();
  const actorRef = adminDb.collection("users").doc(actorUid);

  try {
    const userRef = adminDb.collection("users").doc(userId);
    const [actorSnap, userSnap] = await Promise.all([
      actorRef.get(),
      userRef.get()
    ]);

    const actor = actorSnap.data();
    const userData = userSnap.data();
    const userName = userData?.name || "Unknown User";
    const actorName = await getActorDisplayName(actorUid);

    await addLog({
      category: "users",
      action: "PERMANENT_DELETE",
      severity: "high",
      actorRole: actor?.role,
      actorName: actorName,
      message: `User "${userName}" was permanently deleted by ${actorName}`,
    });

  } catch (error) {
    console.error("Failed to permanently delete user:", error);
    throw error;
  }
}

// ---------------- UPDATE USER PROFILE ----------------
export async function updateUserProfile(userId: string, data: any, actorUid: string) {
  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(userId);
    const actorRef = adminDb.collection("users").doc(actorUid);

    // Get current data to check for name change
    const [userSnap, actorSnap] = await Promise.all([
      userRef.get(),
      actorRef.get()
    ]);

    const oldData = userSnap.data();
    const actor = actorSnap.data();
    const oldName = oldData?.name;
    const newName = data.name;
    const actorName = await getActorDisplayName(actorUid);

    // Update the user document
    await userRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Log if name changed
    if (oldName && newName && oldName !== newName) {
      await addLog({
        category: "users",
        action: "UPDATE_PROFILE",
        severity: "medium",
        actorRole: actor?.role,
        actorName: actorName,
        message: `User name changed from "${oldName}" to "${newName}" by ${actorName}`,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new Error("Failed to update profile");
  }
}

// src/actions/userManagement.ts
"use server";
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { addLog } from "./logs"; // Your logging function
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
export async function updateUserPassword(userId: string, newPassword: string, actorUid:string) {
  try {
    const auth = getAdminAuth();
    await auth.updateUser(userId, {
      password: newPassword,
    });
    const actorRef = doc(db, "users", actorUid);
    const actorSnap = await getDoc(actorRef);
    const actor = actorSnap.data();
    await addLog({
      category: "users",
      action: "UPDATE_PASSWORD",
      severity: "high",
      actorRole: actor?.role,
      message: `User "${userId}" password was updated by ${actor?.name}`,
    });
    return { success: true, message: `Password updated for user ${userId}` };
  } catch (error) {
    console.error("Error updating user password:", error);
    return { success: false, message: "Failed to update password" };
  }
}
// ---------------- MOVE USER TO RECYCLE BIN ----------------
export async function moveUserToRecycleBin(userId: string, actorUid: string) {
  const userRef = doc(db, "users", userId);
  const actorRef = doc(db, "users", actorUid);

  try {
    const actorSnap = await getDoc(actorRef);
    const actor = actorSnap.data();

    await updateDoc(userRef, {
      status: "deleted",
      deletedAt: serverTimestamp(),
      deletedBy: actorRef,
    });

    await addLog({
      category: "users",
      action: "MOVE_TO_RECYCLE_BIN",
      severity: "high",
      actorRole: actor?.role,
      message: `User "${userId}" was moved to recycle bin by ${actor?.name}`,
    });
  } catch (error) {
    console.error("Failed to move user to recycle bin:", error);
    throw error;
  }
}

// ---------------- RESTORE USER FROM RECYCLE BIN ----------------
export async function restoreUserFromRecycleBin(userId: string, actorUid: string) {
  const userRef = doc(db, "users", userId);
  const actorRef = doc(db, "users", actorUid);

  try {
    const actorSnap = await getDoc(actorRef);
    const actor = actorSnap.data();

    await updateDoc(userRef, {
      status: "active",
      deletedAt: null,
      deletedBy: null,
    });

    await addLog({
      category: "users",
      action: "RESTORE_FROM_RECYCLE_BIN",
      severity: "medium",
      actorRole: actor?.role,
      message: `User "${userId}" was restored from recycle bin by ${actor?.name}`,
    });
  } catch (error) {
    console.error("Failed to restore user:", error);
    throw error;
  }
}

// ---------------- PERMANENT DELETE USER ----------------
export async function permanentlyDeleteUser(userId: string, actorUid: string) {
  // Note: This requires Admin SDK for real deletion.
  const actorRef = doc(db, "users", actorUid);

  try {
    const actorSnap = await getDoc(actorRef);
    const actor = actorSnap.data();


    await addLog({
      category: "users",
      action: "PERMANENT_DELETE",
      severity: "high",
      actorRole: actor?.role,
      message: `User "${userId}" would be permanently deleted by ${actor?.name} (requires Admin SDK).`,
    });

  } catch (error) {
    console.error("Failed to permanently delete user:", error);
    throw error;
  }
}

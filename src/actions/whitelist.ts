"use server";

import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export interface WhitelistEntry {
  id: string;
  name: string;
}

// GET: Fetch all allowed IDs with names
export async function getWhitelist() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("allowed_student_ids").get();
    
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || "Unknown Name"
    }));
    
    return { success: true, entries };
  } catch (error) {
    console.error("Error fetching whitelist:", error);
    throw new Error("Failed to fetch whitelist");
  }
}

// POST: Add Entries (Bulk)
export async function addWhitelistEntries(entries: { id: string, name: string }[], actorName?: string) {
  try {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error("Invalid input");
    }

    const db = getAdminDb();
    const batch = db.batch();
    const collectionRef = db.collection("allowed_student_ids");
    let count = 0;

    entries.forEach((entry) => {
      if (entry.id && typeof entry.id === 'string' && entry.id.trim().length > 0) {
        const docRef = collectionRef.doc(entry.id.trim());
        batch.set(docRef, { 
            name: entry.name?.trim() || "Unknown Name",
            createdAt: FieldValue.serverTimestamp(),
        });
        count++;
      }
    });

    if (count > 0) {
        await batch.commit();
        
        // Log Activity
        await db.collection("activitylogs").add({
            category: "users",
            action: "Whitelist Batch Add",
            severity: "medium",
            message: `Added ${count} students to whitelist.`,
            actorRole: "admin", 
            actorName: actorName || "Unknown Admin", 
            timestamp: FieldValue.serverTimestamp(),
            time: new Date().toLocaleString(),
        });
    }

    return { success: true, message: `Successfully whitelisted ${count} students` };
  } catch (error: any) {
    console.error("Error adding to whitelist:", error);
    throw new Error(error.message || "Failed to update whitelist");
  }
}

// DELETE: Remove IDs
export async function deleteWhitelistEntries(studentIds: string[], actorName?: string) {
  try {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error("Invalid input");
    }

    const db = getAdminDb();
    const batch = db.batch();
    const collectionRef = db.collection("allowed_student_ids");

    studentIds.forEach((id: string) => {
        const docRef = collectionRef.doc(id);
        batch.delete(docRef);
    });

    await batch.commit();

    // Log Activity
    await db.collection("activitylogs").add({
        category: "users",
        action: "Whitelist Delete",
        severity: "medium",
        message: `Removed ${studentIds.length} students from whitelist: ${studentIds.join(', ')}`,
        actorRole: "admin",
        actorName: actorName || "Unknown Admin", 
        timestamp: FieldValue.serverTimestamp(),
        time: new Date().toLocaleString(),
    });

    return { success: true, message: `Successfully removed ${studentIds.length} IDs` };
  } catch (error: any) {
    console.error("Error removing from whitelist:", error);
    throw new Error(error.message || "Failed to remove IDs");
  }
}

// PATCH: Update an entry (Edit ID or Name)
export async function updateWhitelistEntry(oldStudentId: string, newStudentId?: string, name?: string, actorName?: string) {
  try {
    if (!oldStudentId) {
      throw new Error("Original Student ID is required");
    }

    const db = getAdminDb();
    const oldRef = db.collection("allowed_student_ids").doc(oldStudentId);

    // Case 1: ID Change (and potentially name change)
    if (newStudentId && newStudentId !== oldStudentId) {
        const newRef = db.collection("allowed_student_ids").doc(newStudentId);
        
        // Check conflicts
        const newSnap = await newRef.get();
        if (newSnap.exists) {
            throw new Error("New Student ID already exists");
        }
        
        const oldSnap = await oldRef.get();
        if (!oldSnap.exists) {
            throw new Error("Original Student ID not found");
        }

        const batch = db.batch();
        // Create new
        batch.set(newRef, {
            name: name?.trim() || oldSnap.data()?.name,
            createdAt: oldSnap.data()?.createdAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        // Delete old
        batch.delete(oldRef);
        await batch.commit();

        // Log Activity
        await db.collection("activitylogs").add({
            category: "users",
            action: "Whitelist Edit ID",
            severity: "high",
            message: `Renamed Student ID from "${oldStudentId}" to "${newStudentId}"`,
            actorRole: "admin",
            actorName: actorName || "Unknown Admin",
            timestamp: FieldValue.serverTimestamp(),
            time: new Date().toLocaleString(),
        });

    } else {
        // Case 2: Just Name Update
        if (!name) throw new Error("Name is required");

        await oldRef.update({
            name: name.trim(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Log Activity
        await db.collection("activitylogs").add({
            category: "users",
            action: "Whitelist Edit Name",
            severity: "low",
            message: `Updated name for Student ID "${oldStudentId}" to "${name}"`,
            actorRole: "admin",
            actorName: actorName || "Unknown Admin",
            timestamp: FieldValue.serverTimestamp(),
            time: new Date().toLocaleString(),
        });
    }

    return { success: true, message: "Successfully updated entry" };
  } catch (error: any) {
    console.error("Error updating whitelist:", error);
    throw new Error(error.message || "Failed to update entry");
  }
}

export async function checkWhitelist(studentId: string, fullName: string) {
    try {
        const db = getAdminDb();
        const doc = await db.collection("allowed_student_ids").doc(studentId).get();
        
        if (!doc.exists) {
            return { allowed: false, error: "ID not whitelisted" };
        }
        
        const data = doc.data();
        if (data?.name?.toLowerCase() !== fullName.toLowerCase()) {
            return { allowed: false, error: "Name does not match whitelist" };
        }
        
        return { allowed: true, name: data?.name };
    } catch (error) {
        process.env.NODE_ENV === "development" && console.error("Whitelist check error:", error);
        return { allowed: false, error: "System error" };
    }
}

export async function getWhitelistEntry(studentId: string) {
    try {
        const db = getAdminDb();
        const doc = await db.collection("allowed_student_ids").doc(studentId).get();
        if (!doc.exists) return null;
        return { id: doc.id, name: doc.data()?.name };
    } catch (error) {
        return null;
    }
}

"use server";

import { getAdminDb } from "@/services/firebaseAdmin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminAuth } from "@/services/firebaseAdmin";

/* ---------------- TYPES ---------------- */

export type SeverityLevel = "low" | "medium" | "high";


export interface LogEntry {
  id: string;
  category: "posts" | "users" | "system";
  action: string;
  severity: SeverityLevel;
  message: string;
  time: string;
  actorRole: string;
  actorName?: string;
  timestamp: number;

}

/* ---------------- HELPER: GET DISPLAY NAME ---------------- */

/**
 * Gets a clean display name for logging, avoiding emails
 * Tries Firebase Auth displayName first, then falls back to Firestore name
 * If both are emails or unavailable, returns "Unknown User"
 */
export async function getActorDisplayName(uid: string): Promise<string> {
  try {
    // Try Firebase Auth first
    const auth = getAdminAuth();
    const authUser = await auth.getUser(uid);
    
    // Check if displayName exists and is not an email
    if (authUser.displayName && !authUser.displayName.includes('@')) {
      return authUser.displayName;
    }

    // Fallback to Firestore user document
    const db = getAdminDb();
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    
    // Check if name exists and is not an email
    if (userData?.name && !userData.name.includes('@')) {
      return userData.name;
    }

    // If both are emails or unavailable, return fallback
    return "Unknown User";
  } catch (error) {
    console.error("Error fetching actor display name:", error);
    return "Unknown User";
  }
}

/* ---------------- CLEANUP LOGS (30-Day Retention) ---------------- */

async function cleanupOldLogs() {
  try {
    const db = getAdminDb();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Convert to Firestore Timestamp for comparison if needed, or Date object usually works with Admin SDK
    const threshold = Timestamp.fromDate(thirtyDaysAgo);

    const snapshot = await db.collection("activitylogs")
      .where("timestamp", "<", threshold)
      .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} old logs.`);
  } catch (error) {
    console.error("Error cleaning up old logs:", error);
  }
}

/* ---------------- GET LOGS ---------------- */

export async function getLogs(): Promise<LogEntry[]> {
  // Trigger cleanup asynchronously (fire and forget) so it doesn't block the UI load
  cleanupOldLogs(); 

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("activitylogs").orderBy("timestamp", "desc").get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      let ts = Date.now();
      // Handle Firestore Timestamp or number or date
      if (data.timestamp?.toMillis) {
        ts = data.timestamp.toMillis();
      } else if (typeof data.timestamp === 'number') {
        ts = data.timestamp;
      } else if (data.timestamp?.toDate) {
        ts = data.timestamp.toDate().getTime();
      }

      return {
        id: doc.id,
        category: data.category ?? "system",
        action: data.action ?? "UNKNOWN",
        severity: data.severity ?? "low",
        message: data.message ?? "No message",
        time: data.time ?? new Date(ts).toLocaleString(),
        timestamp: ts,
        actorRole: data.actorRole ?? "unknown",
        actorName: data.actorName || "System",
      };
    });
  } catch (error) {
    console.error("Error fetching logs (Admin SDK):", error);
    return [];
  }
}

/* ---------------- ADD LOG ---------------- */

export async function addLog({
  category,
  action,
  severity,
  message,
  actorRole = "system",
  actorName,
}: {
  category: "posts" | "users" | "system";
  action: string;
  severity: SeverityLevel;
  message: string;
  actorRole?: string;
  actorName?: string;
}) {
  try {
    const db = getAdminDb();
    await db.collection("activitylogs").add({
      category,
      action,
      severity,
      message,
      actorRole,
      actorName: actorName || "System",
      timestamp: FieldValue.serverTimestamp(),
      time: new Date().toLocaleString(),
    });
  } catch (error) {
    console.error("Error adding log (Admin SDK):", error);
  }
}

/* ---------------- DELETE ALL LOGS (ARCHIVE TO TRASH) ---------------- */

/**
 * Moves ALL activity logs to the Trash Bin (Archives them)
 * Logs are grouped into a single "Batch" entry in 'trash_log_batches' collection
 */
export async function deleteAllLogs(actorUid: string, password: string): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const auth = getAdminAuth();
    const db = getAdminDb();

    // 1. Get actor details
    const actorDoc = await db.collection("users").doc(actorUid).get();
    const actorData = actorDoc.data();
    const actorEmail = actorData?.email;
    const actorName = await getActorDisplayName(actorUid);

    if (!actorEmail) {
      return { success: false, message: "User email not found." };
    }

    // 2. Verify user is an admin
    if (actorData?.role !== 'admin') {
      return { success: false, message: "Access denied. Only admins can delete all logs." };
    }

    if (!password || password.length < 6) {
      return { success: false, message: "Invalid password format." };
    }

    // 3. Get all logs
    const snapshot = await db.collection("activitylogs").get();
    const count = snapshot.size;

    if (count === 0) {
      return { success: false, message: "No logs to delete." };
    }

    // 4. Create a Batch Archive Record
    const batchRef = db.collection('trash_log_batches').doc();
    const timestamp = new Date();
    
    await batchRef.set({
        title: `Activity Logs (${timestamp.toLocaleDateString()})`,
        count: count,
        deletedBy: actorUid, // Store UID for linking
        deletedAt: FieldValue.serverTimestamp(), // Use server timestamp
        status: 'deleted'
    });

    // 5. Move logs to subcollection and delete originals
    // We use batches of 450 (safe margin) to copy then delete
    // Note: To be perfectly safe against failure mid-way, we should copy ALL, then delete ALL.
    // Or do copy+delete in one atomic batch per chunk. Atomic is best.
    
    const batchSize = 450; 
    const batches = [];
    let currentBatch = db.batch();
    let opCount = 0;

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const archiveRef = batchRef.collection('logs').doc(doc.id);
        
        // Copy to archive
        currentBatch.set(archiveRef, data);
        // Delete original
        currentBatch.delete(doc.ref);
        
        opCount++;
        
        if (opCount >= batchSize) {
            batches.push(currentBatch.commit());
            currentBatch = db.batch();
            opCount = 0;
        }
    });

    if (opCount > 0) {
        batches.push(currentBatch.commit());
    }

    await Promise.all(batches);

    // 6. Log this critical action (in the NEW active logs, not the deleted ones)
    // We do this AFTER the deletion so it remains as the first new log
    await addLog({
      category: "system",
      action: "DELETE_ALL_LOGS",
      severity: "high",
      actorRole: actorData?.role || "admin",
      actorName: actorName,
      message: `ALL ACTIVITY LOGS ARCHIVED (${count} entries) by ${actorName}`,
    });

    return { 
      success: true, 
      message: `Successfully moved ${count} activity logs to Trash Bin.`,
      count 
    };

  } catch (error) {
    console.error("Error archiving logs:", error);
    return { 
      success: false, 
      message: "Failed to delete logs. Please try again." 
    };
  }
}

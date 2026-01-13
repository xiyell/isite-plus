"use server";

import { getAdminDb } from "@/services/firebaseAdmin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

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

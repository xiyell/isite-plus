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
  timestamp: number;

}

/* ---------------- GET LOGS ---------------- */

export async function getLogs(): Promise<LogEntry[]> {
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
}: {
  category: "posts" | "users" | "system";
  action: string;
  severity: SeverityLevel;
  message: string;
  actorRole?: string;
}) {
  try {
    const db = getAdminDb();
    await db.collection("activitylogs").add({
      category,
      action,
      severity,
      message,
      actorRole,
      timestamp: FieldValue.serverTimestamp(),
      time: new Date().toLocaleString(),
    });
  } catch (error) {
    console.error("Error adding log (Admin SDK):", error);
  }
}

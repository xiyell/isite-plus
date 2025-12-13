"use server";

import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";

/* ---------------- TYPES ---------------- */

export type SeverityLevel = "low" | "medium" | "high";

export interface LogEntry {
  id: string;
  category: "posts" | "users" | "system";
  action: string;
  severity: SeverityLevel;
  message: string;
  time: string;
  timestamp: number;
}

/* ---------------- GET LOGS ---------------- */

export async function getLogs(): Promise<LogEntry[]> {
  const q = query(
    collection(db, "activitylogs"),
    orderBy("timestamp", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      category: data.category,
      action: data.action,
      severity: data.severity,
      message: data.message,
      time: data.time,
      timestamp: (data.timestamp as Timestamp).toMillis(),
    };
  });
}

/* ---------------- ADD LOG ---------------- */

export async function addLog({
  category,
  action,
  severity,
  message,
}: {
  category: "posts" | "users" | "system";
  action: string;
  severity: SeverityLevel;
  message: string;
}) {
  await addDoc(collection(db, "activitylogs"), {
    category,
    action,
    severity,
    message,
    timestamp: serverTimestamp(),
    time: new Date().toLocaleString(),
  });
}

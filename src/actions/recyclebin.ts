// actions/recyclebin.ts
"use server";

import { getAdminDb } from "@/services/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export type TrashType = "post" | "announcement" | "user" | "evaluation" | "ibot";

export interface TrashedItem {
  id: string;
  type: TrashType;
  title: string;
  deletedBy: string;
  deletedAt: string;
}

const COLLECTION_MAP: Record<TrashType, string> = {
  post: "community",
  announcement: "announcements",
  user: "users",
  evaluation: "evaluations",
  ibot: "ibot_responses",
};

export async function getTrash(): Promise<TrashedItem[]> {
  try {
    const db = getAdminDb();
    const result: TrashedItem[] = [];

    const fetchDeleted = async (type: TrashType, colName: string) => {
      let q;
      if (type === 'user') {
        q = db.collection(colName).where("isDeleted", "==", true);
      } else {
        q = db.collection(colName).where("status", "==", "deleted");
      }

      const snap = await q.get();
      snap.forEach(doc => {
        const d = doc.data();
        let deletedAt = "Unknown";
        if (d.deletedAt) {
          // Handle Firestore Timestamp or Date
          if (typeof d.deletedAt.toDate === 'function') {
            deletedAt = d.deletedAt.toDate().toLocaleString();
          } else if (d.deletedAt instanceof Date) {
            deletedAt = d.deletedAt.toLocaleString();
          } else if (typeof d.deletedAt === 'string' || typeof d.deletedAt === 'number') {
            deletedAt = new Date(d.deletedAt).toLocaleString();
          }
        }

        // Safe conversion of deletedBy which might be a DocumentReference
        let deletedByStr = "Unknown";
        if (d.deletedBy) {
          if (typeof d.deletedBy === 'string') {
            deletedByStr = d.deletedBy;
          } else if (d.deletedBy.id) {
            // Handle Firestore DocumentReference (has .id property)
            deletedByStr = d.deletedBy.id;
          } else if (d.deletedBy.path) {
            deletedByStr = d.deletedBy.path;
          }
        }

        // Title fallback for different types
        let title = d.title || d.name || d.email;
        if (type === 'ibot') {
          title = d.trigger || "Untitled Trigger";
        }

        result.push({
          id: doc.id,
          type: type,
          title: title || "Untitled",
          deletedBy: deletedByStr,
          deletedAt: deletedAt,
        });
      });
    };

    await Promise.all([
      fetchDeleted('post', COLLECTION_MAP.post),
      fetchDeleted('announcement', COLLECTION_MAP.announcement),
      fetchDeleted('user', COLLECTION_MAP.user),
      fetchDeleted('evaluation', COLLECTION_MAP.evaluation),
      fetchDeleted('ibot', COLLECTION_MAP.ibot),
    ]);

    return result;
  } catch (error) {
    console.error("Server Action getTrash Error:", error);
    // Return empty array instead of crashing layout
    return [];
  }
}

export async function restoreItem(id: string, type: TrashType) {
  try {
    const db = getAdminDb();
    const ref = db.collection(COLLECTION_MAP[type]).doc(id);

    let updateData = {};
    if (type === "post") {
      updateData = { status: "approved", isDeleted: false, deletedAt: null, deletedBy: null };
    } else if (type === "announcement") {
      updateData = { status: "active", isDeleted: false, deletedAt: null, deletedBy: null };
    } else if (type === "user") {
      updateData = { status: "approved", isDeleted: false, deletedAt: null, deletedBy: null };
    } else if (type === "evaluation") {
      updateData = { status: "draft", isDeleted: false, deletedAt: null, deletedBy: null };
    } else if (type === "ibot") {
      updateData = { status: "active", isDeleted: false, deletedAt: null, deletedBy: null };
    }

    await ref.update(updateData);
    return { success: true };
  } catch (error) {
    console.error("Error restoring item:", error);
    throw new Error("Failed to restore item");
  }
}

export async function permanentlyDeleteItem(id: string, type: TrashType) {
  try {
    const db = getAdminDb();
    const ref = db.collection(COLLECTION_MAP[type]).doc(id);
    await ref.delete();
    return { success: true };
  } catch (error) {
    console.error("Error deleting item:", error);
    throw new Error("Failed to delete item");
  }
}

// actions/recyclebin.ts
"use server";

import { getAdminDb, getAdminAuth } from "@/services/firebaseAdmin";
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
            deletedAt = d.deletedAt.toDate().toISOString();
          } else if (d.deletedAt instanceof Date) {
            deletedAt = d.deletedAt.toISOString();
          } else if (typeof d.deletedAt === 'string' || typeof d.deletedAt === 'number') {
            deletedAt = new Date(d.deletedAt).toISOString();
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

    // --- RESOLVE NAMES ---
    // Collect unique UIDs from deletedBy fields
    const uids = Array.from(new Set(result.map(item => item.deletedBy).filter(id => id && id !== "Unknown")));
    
    if (uids.length > 0) {
      const userMap: Record<string, string> = {};
      
      // Batch fetch users if there are many, but for now we can do them in parallel or chunks
      // Firestore 'in' query limit is 30.
      const chunks = [];
      for (let i = 0; i < uids.length; i += 30) {
        chunks.push(uids.slice(i, i + 30));
      }

      await Promise.all(chunks.map(async (chunk) => {
        const userSnaps = await db.collection("users").where("__name__", "in", chunk).get();
        userSnaps.forEach(doc => {
          userMap[doc.id] = doc.data().name || doc.data().email || doc.id;
        });
      }));

      // Map UIDs to names in the result
      result.forEach(item => {
        if (userMap[item.deletedBy]) {
          item.deletedBy = userMap[item.deletedBy];
        }
      });
    }

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
    
    // 1. If it's a user, delete from Authentication first
    if (type === 'user') {
        try {
            const auth = getAdminAuth();
            await auth.deleteUser(id);
            console.log(`User ${id} deleted from Authentication.`);
        } catch (authError) {
            console.error(`Failed to delete user ${id} from Authentication (might already be deleted):`, authError);
            // We continue to delete from Firestore even if auth delete fails (e.g. user not found)
        }
    }

    // 2. Delete from Firestore (Soft-deleted record)
    const ref = db.collection(COLLECTION_MAP[type]).doc(id);
    await ref.delete();
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting item:", error);
    throw new Error("Failed to delete item");
  }
}

export async function emptyTrash(type: TrashType) {
  try {
    const db = getAdminDb();
    const colName = COLLECTION_MAP[type];
    if (!colName) throw new Error("Invalid type");

    // 1. Fetch all eligible items
    let q;
    if (type === 'user') {
        q = db.collection(colName).where("isDeleted", "==", true);
    } else {
        q = db.collection(colName).where("status", "==", "deleted");
    }
    const snap = await q.get();

    if (snap.empty) return { success: true, count: 0 };

    // Firestore batch limit is 500. Handle chunks if needed, but for now assuming one batch or multiple calls.
    // If strict 500 limit is needed, we should loop. Here is a simple loop implementation.
    const batches = [];
    let currentBatch = db.batch();
    let batchCount = 0;
    
    const auth = getAdminAuth();
    const userDeletePromises: Promise<any>[] = [];
    let count = 0;

    snap.docs.forEach((doc) => {
        currentBatch.delete(doc.ref);
        batchCount++;
        count++;

        if (type === 'user') {
            userDeletePromises.push(
                auth.deleteUser(doc.id).catch(e => console.warn(`Failed to delete auth user ${doc.id}`, e))
            );
        }

        if (batchCount >= 450) {
            batches.push(currentBatch.commit());
            currentBatch = db.batch();
            batchCount = 0;
        }
    });

    if (batchCount > 0) {
        batches.push(currentBatch.commit());
    }

    // 3. Commit Firestore Batches
    await Promise.all(batches);

    // 4. Wait for Auth deletions
    if (type === 'user') {
        await Promise.all(userDeletePromises);
    }

    return { success: true, count };
  } catch (error) {
    console.error("Error emptying trash:", error);
    throw new Error("Failed to empty trash");
  }
}

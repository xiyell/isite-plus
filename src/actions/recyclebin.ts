// actions/recyclebin.ts
"use server";

import { getAdminDb, getAdminAuth, getAdminStorage } from "@/services/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export type TrashType = "post" | "announcement" | "user" | "evaluation" | "ibot" | "log_batch";

export interface TrashedItem {
  id: string;
  type: TrashType;
  title: string;
  deletedBy: string;
  deletedAt: string;
  status?: string;
}

const COLLECTION_MAP: Record<TrashType, string> = {
  post: "community",
  announcement: "announcements",
  user: "users",
  evaluation: "evaluations",
  ibot: "ibot_responses",
  log_batch: "trash_log_batches",
};

export async function getTrash(): Promise<TrashedItem[]> {
  try {
    const db = getAdminDb();
    const result: TrashedItem[] = [];

    const fetchDeleted = async (type: TrashType, colName: string) => {
      let q;
      if (type === 'user') {
        q = db.collection(colName).where("isDeleted", "==", true);
      } else if (type === 'announcement') {
        q = db.collection(colName).where("status", "in", ["deleted", "disabled"]);
      } else if (type === 'log_batch') {
        // Log batches are always "deleted" by nature of being in this collection
        q = db.collection(colName); 
      } else {
        q = db.collection(colName).where("status", "==", "deleted");
      }

      const snap = await q.get();
      snap.forEach(doc => {
        const d = doc.data();
        let deletedAt = "Unknown";
        if (d.deletedAt) {
          if (typeof d.deletedAt.toDate === 'function') {
            deletedAt = d.deletedAt.toDate().toISOString();
          } else if (d.deletedAt instanceof Date) {
            deletedAt = d.deletedAt.toISOString();
          } else if (typeof d.deletedAt === 'string' || typeof d.deletedAt === 'number') {
            deletedAt = new Date(d.deletedAt).toISOString();
          }
        }

        let deletedByStr = "Unknown";
        if (d.deletedBy) {
          if (typeof d.deletedBy === 'string') {
            deletedByStr = d.deletedBy;
          } else if (d.deletedBy.id) {
            deletedByStr = d.deletedBy.id;
          }
        }

        let title = d.title || d.name || d.email;
        if (type === 'ibot') {
          title = d.trigger || "Untitled Trigger";
        }
        if (type === 'log_batch') {
            // Log batches just have a generated title like "Logs Backup..."
            title = d.title || `Activity Logs w/ ${d.count || 0} entries`;
        }

        result.push({
          id: doc.id,
          type: type,
          title: title || "Untitled",
          deletedBy: deletedByStr,
          deletedAt: deletedAt,
          status: d.status,
        });
      });
    };

    await Promise.all([
      fetchDeleted('post', COLLECTION_MAP.post),
      fetchDeleted('announcement', COLLECTION_MAP.announcement),
      fetchDeleted('user', COLLECTION_MAP.user),
      fetchDeleted('evaluation', COLLECTION_MAP.evaluation),
      fetchDeleted('ibot', COLLECTION_MAP.ibot),
      fetchDeleted('log_batch', COLLECTION_MAP.log_batch),
    ]);

    // --- RESOLVE NAMES ---
    const uids = Array.from(new Set(result.map(item => item.deletedBy).filter(id => id && id !== "Unknown")));
    
    if (uids.length > 0) {
      const userMap: Record<string, string> = {};
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

      result.forEach(item => {
        if (userMap[item.deletedBy]) {
          item.deletedBy = userMap[item.deletedBy];
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Server Action getTrash Error:", error);
    return [];
  }
}

export async function restoreItem(id: string, type: TrashType) {
  try {
    const db = getAdminDb();
    const ref = db.collection(COLLECTION_MAP[type]).doc(id);

    if (type === 'log_batch') {
        const batchDoc = await ref.get();
        if (!batchDoc.exists) throw new Error("Batch not found");

        const logsSnap = await ref.collection('logs').get();
        const restoreBatch = db.batch();
        let opCount = 0;
        const batches = [];

        // Move items back to activitylogs
        logsSnap.docs.forEach(doc => {
            const data = doc.data();
            const logRef = db.collection('activitylogs').doc(); // New ID or preserve? Let's give new ID to avoid conflict, or use doc.id? 
            // Better to use doc.id if we want exact restoration, but logs are immutable usually.
            // Let's use clean add.
            restoreBatch.set(logRef, data);
            
            opCount++;
            if (opCount >= 450) {
                batches.push(restoreBatch.commit());
                opCount = 0;
            }
        });

        if (opCount > 0) batches.push(restoreBatch.commit());
        await Promise.all(batches);

        // Delete the batch doc (and subcollection needs recursive delete usually, but we can just delete parent doc reference in UI, 
        // technically subcollections persist in Firestore but act as orphaned. For proper cleanup we should delete subcollection.)
        // We will call the recursive delete helper here.
        await recursiveDelete(ref);
        return { success: true };
    }

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
    
    // 1. If it's a user, delete from Authentication AND Storage first
    if (type === 'user') {
        try {
            const auth = getAdminAuth();
            await auth.deleteUser(id);
            console.log(`User ${id} deleted from Authentication.`);

            // Delete Storage Files (Avatar, uploads, etc.)
            const storage = getAdminStorage();
            const bucket = storage.bucket();

            // Attempt to delete 'users/{id}' folder
            await bucket.deleteFiles({ prefix: `users/${id}/` });
            console.log(`Deleted storage folder: users/${id}/`);

             // Attempt to delete 'avatars/{id}' folder (if applicable)
            await bucket.deleteFiles({ prefix: `avatars/${id}/` });
            console.log(`Deleted storage folder: avatars/${id}/`);

        } catch (authError) {
            console.error(`Failed to cleanup user ${id} (Auth/Storage):`, authError);
        }
    }

    const ref = db.collection(COLLECTION_MAP[type]).doc(id);

    if (type === 'log_batch') {
        await recursiveDelete(ref);
    } else {
        await ref.delete();
    }
    
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
    } else if (type === 'announcement') {
        q = db.collection(colName).where("status", "in", ["deleted", "disabled"]);
    } else if (type === 'log_batch') {
        q = db.collection(colName);
    } else {
        q = db.collection(colName).where("status", "==", "deleted");
    }
    const snap = await q.get();

    if (snap.empty) return { success: true, count: 0 };

    // Use Recursive Delete for log_batch to clean subcollections
    if (type === 'log_batch') {
       const deletePromises = snap.docs.map(doc => recursiveDelete(doc.ref));
       await Promise.all(deletePromises);
       return { success: true, count: snap.size };
    }

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

    await Promise.all(batches);

    if (type === 'user') {
        await Promise.all(userDeletePromises);
    }

    return { success: true, count };
  } catch (error) {
    console.error("Error emptying trash:", error);
    throw new Error("Failed to empty trash");
  }
}

// Helper for recursive delete (for log batches)
async function recursiveDelete(docRef: FirebaseFirestore.DocumentReference) {
    const db = getAdminDb();
    const bulkWriter = db.bulkWriter();
    await db.recursiveDelete(docRef, bulkWriter);
}

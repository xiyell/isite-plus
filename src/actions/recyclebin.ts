// actions/trashActions.ts
"use server";

import { db } from "@/services/firebase";
import { collection, doc, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";

export type TrashType = "post" | "announcement" | "user";

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
};

export async function getTrash(): Promise<TrashedItem[]> {
  const result: TrashedItem[] = [];

  const postQuery = query(collection(db, COLLECTION_MAP.post), where("status", "==", "deleted"));
  const postSnap = await getDocs(postQuery);
  postSnap.forEach(docSnap => {
    const d = docSnap.data();
    result.push({
      id: docSnap.id,
      type: "post",
      title: d.title || "Untitled",
      deletedBy: d.deletedBy || "Unknown",
      deletedAt: d.deletedAt?.toDate().toLocaleString() || "Unknown",
    });
  });


  return result;
}

export async function restoreItem(id: string, type: TrashType) {
  try {
    const ref = doc(db, COLLECTION_MAP[type], id);
    if (type === "post") {
      await updateDoc(ref, { status: "approved", deletedAt: null, deletedBy: null });
    }
  } catch (error) {
    console.error("Error restoring item:", error);
    throw error;
  }
}

export async function permanentlyDeleteItem(id: string, type: TrashType) {
  const ref = doc(db, COLLECTION_MAP[type], id);
  await deleteDoc(ref);
}

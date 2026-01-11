
"use server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { Announcement } from "@/types/announcement";
import { addLog } from "./logs";
import { revalidatePath } from "next/cache";

export async function getAnnouncements(): Promise<Announcement[]> {
  const db = getAdminDb();
  const snapshot = await db.collection("announcements").where("status", "!=", "deleted").get();
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as Announcement;
  });
}

export async function createAnnouncement(data: any) {
  const db = getAdminDb();
  const res = await db.collection("announcements").add({
    ...data,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await addLog({
    category: "posts",
    action: "CREATE_ANNOUNCEMENT",
    severity: "low",
    message: `Announcement "${data.title}" was created`,
    actorRole: "system",
  });
  
  revalidatePath("/");
  revalidatePath("/announcement");
  revalidatePath("/dashboard");
  
  return { id: res.id };
}

export async function deleteAnnouncement(id: string) {
    const db = getAdminDb();
    await db.collection("announcements").doc(id).update({
        status: "deleted",
        deletedAt: FieldValue.serverTimestamp(),
    });

    await addLog({
        category: "posts",
        action: "DELETE_ANNOUNCEMENT_SOFT",
        severity: "medium",
        message: `Announcement ID "${id}" was moved to trash`,
        actorRole: "system",
    });

    revalidatePath("/");
    revalidatePath("/announcement");
    revalidatePath("/dashboard");
}

export async function getLatestAnnouncements(limit: number): Promise<Announcement[]> {
  const db = getAdminDb();
  // Note: Admin SDK doesn't support "!=" without an index if combined with other things, 
  // but for simple fetch it's fine. Or just fetch all and filter in memory if small.
  const snapshot = await db.collection("announcements")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    } as Announcement;
  });
}

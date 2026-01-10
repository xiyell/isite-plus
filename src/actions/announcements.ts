
"use server";
import { db } from "@/services/firebase";
import { Announcement } from "@/types/announcement";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { addLog } from "./logs";

export async function getAnnouncements(): Promise<Announcement[]> {
  const querySnapshot = await getDocs(collection(db, "announcements"));
  return querySnapshot.docs.map((doc) => doc.data() as Announcement);
}

export async function createAnnouncement(data: Omit<Announcement, "id" | "createdAt">) {
  await addDoc(collection(db, "announcements"), {
    ...data,
    createdAt: serverTimestamp(),
  });

  await addLog({
    category: "posts",
    action: "CREATE_ANNOUNCEMENT",
    severity: "low",
    message: `Announcement "${data.title}" was created`,
    actorRole: "system", // In a real app, pass the actor
  });
}


export async function getLatestAnnouncements(limit: number): Promise<Announcement[]> {
  const querySnapshot = await getDocs(collection(db, "announcements"));

  const announcements = querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      image: data.image,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt || new Date().toISOString(),
    } as Announcement;
  });

  // Sort by date (strings are converted to Date for sorting)
  announcements.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Limit the results
  return announcements.slice(0, limit);
}
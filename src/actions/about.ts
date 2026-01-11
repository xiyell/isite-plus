"use server";

import { getAdminDb } from "@/services/firebaseAdmin";

export async function getContributorImages(names: string[]) {
  try {
    const db = getAdminDb();
    // Firestore 'in' limitation is 30 in admin sdk, and we only have ~5 names.
    const snapshot = await db.collection("users").where("name", "in", names).get();
    
    const images: Record<string, string> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name && data.photoURL) {
        images[data.name] = data.photoURL;
      }
    });
    
    return images;
  } catch (error) {
    console.error("Error fetching contributor images:", error);
    return {};
  }
}

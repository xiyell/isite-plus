import * as admin from "firebase-admin";

// Initialize only once
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
    }
} catch (error) {
    console.error("Firebase Admin Init Error (Check .env.local):", error);
}

export const getAdminAuth = () => {
    if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
    return admin.auth();
};

export const getAdminDb = () => {
    if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
    return admin.firestore();
};

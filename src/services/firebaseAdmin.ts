import * as admin from "firebase-admin";

// Initialize only once
try {
    if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, "\n"),
                }),
                databaseURL: process.env.FIREBASE_DATABASE_URL,
            });
        } else {
            console.warn("⚠️ Firebase Admin skipped: Missing .env.local variables (FIREBASE_PROJECT_ID, etc.)");
        }
    }
} catch (error) {
    console.error("Firebase Admin Init Error:", error);
}

export const getAdminAuth = () => {
    if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
    return admin.auth();
};

export const getAdminDb = () => {
    if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
    return admin.firestore();
};

import * as admin from "firebase-admin";

function initFirebase() {
    if (admin.apps.length) return; // Already initialized

    console.log("🔥 Firebase Init: Checking credentials...");
    let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        // Detailed Debug Logging
        console.log(`🔥 Key Debug - Length: ${serviceAccountKey.length}`);
        if (serviceAccountKey.length > 0) {
            console.log(`🔥 Start: '${serviceAccountKey.substring(0, 1)}', End: '${serviceAccountKey.slice(-1)}'`);
        }

        try {
            // Remove potential wrapping quotes from .env
            if (serviceAccountKey.startsWith("'") && serviceAccountKey.endsWith("'")) {
                console.log("🔥 Stripping single quotes...");
                serviceAccountKey = serviceAccountKey.slice(1, -1);
            }
            if (serviceAccountKey.startsWith('"') && serviceAccountKey.endsWith('"')) {
                console.log("🔥 Stripping double quotes...");
                serviceAccountKey = serviceAccountKey.slice(1, -1);
            }

            const serviceAccount = JSON.parse(serviceAccountKey);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL,
            });
            console.log("✅ Firebase Admin initialized with SERVICE_ACCOUNT_KEY");
        } catch (error) {
            console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
            throw new Error(`FATAL: Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON. ${(error as Error).message}`);
        }
    } else {
        // Fallback to individual variables
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
            console.log("✅ Firebase Admin initialized with individual variables");
        } else {
            console.warn("⚠️ Firebase Admin skipped: Missing credentials in .env.local");
            throw new Error("FATAL: Missing FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY in .env.local");
        }
    }
}

export const getAdminAuth = () => {
    initFirebase();
    if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
    return admin.auth();
};

export const getAdminDb = () => {
    initFirebase();
    if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
    return admin.firestore();
};

import { getAdminDb } from "@/services/firebaseAdmin";
const db = getAdminDb();

const PROFANITY_LIST = [
    "badword1", "badword2", "spam", "scam", // Placeholder list
    "ass", "bastard", "bitch", "crap", "damn", "fuck", "shit",
    "sex", "xxx", "porn"
];

export function checkSpam(text: string): boolean {
    // Check for repetitive characters (e.g., "aaaaa")
    const repetitiveRegex = /(.)\1{4,}/;
    if (repetitiveRegex.test(text)) return true;

    // Check for excessive capitalization
    const upperCaseCount = (text.match(/[A-Z]/g) || []).length;
    if (text.length > 10 && upperCaseCount / text.length > 0.8) return true;

    return false;
}

export function checkProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    return PROFANITY_LIST.some(word => lowerText.includes(word));
}

export async function checkCooldown(userId: string, collectionName: string = "community"): Promise<boolean> {
    try {
        const snapshot = await db.collection(collectionName)
            .where("postedBy", "==", db.collection("users").doc(userId)) // Assuming postedBy is a reference
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        // Also try checking if postedBy is just a string UID (depends on your schema)
        let lastPostTime = 0;

        if (snapshot.empty) {
            // Double check with string query if reference query failed/was empty (schema compatibility)
            const snapshotString = await db.collection(collectionName)
                .where("postedBy", "==", userId)
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();

            if (!snapshotString.empty) {
                const data = snapshotString.docs[0].data();
                lastPostTime = data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || 0;
            }
        } else {
            const data = snapshot.docs[0].data();
            lastPostTime = data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || 0;
        }

        if (lastPostTime === 0) return true; // No previous posts

        const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
        const timeSinceLastPost = Date.now() - lastPostTime;

        return timeSinceLastPost > COOLDOWN_MS;

    } catch (error) {
        console.error("Error checking cooldown:", error);
        // In case of error (index missing etc), fail open or closed? 
        // Let's fail open (allow post) but log error, to avoid blocking users if DB is quirky.
        return true;
    }
}

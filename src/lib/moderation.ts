import { getAdminDb } from "@/services/firebaseAdmin";
const db = getAdminDb();

const PROFANITY_LIST = [
    // English
    "fuck", "shit", "bitch", "ass", "bastard", "crap", "damn", "sex", "xxx", "porn", "pussy", "dick", "cock", "cunt",
    "motherfucker", "fucker", "faggot", "nigger", "slut", "whore",
    // Tagalog / Filipino
    "puta", "gago", "tarantado", "tangina", "tang i na", "putangina", "putang ina", "p0ta", "g4go", "tarantad0",
    "bobo", "bubu", "engot", "tanga", "ulol", "olats", "kupal", "hudas", "buwisit", "bwisit", "pakshet", "pakyu",
    "hayop", "lintek", "punyeta", "bwakanangin", "kantot", "iyutan", "libog", "manyak", "salsal", "tamod",
    "titi", "tite", "tyte", "tity", "puke", "pepe", "dede", "bulbul", "burat", "bayag"
];

const SPAM_KEYWORDS = [
    "free money", "click here", "subscribe", "prize", "winner", "crypto", "bitcoin", "$$$", "earn money",
    "work from home", "casinos", "betting", "lottery", "giveaway", "follow me", "check my profile"
];

export function checkSpam(text: string): boolean {
    const lowerText = text.toLowerCase();

    // 1. Keyword check
    if (SPAM_KEYWORDS.some(word => lowerText.includes(word))) return true;

    // 2. Repetitive characters (e.g., "aaaaa")
    const repetitiveRegex = /(.)\1{5,}/;
    if (repetitiveRegex.test(text)) return true;

    // 3. Excessive capitalization (ALL CAPS)
    const upperCaseCount = (text.match(/[A-Z]/g) || []).length;
    if (text.length > 20 && upperCaseCount / text.length > 0.7) return true;

    // 4. Multiple URLs (common in spam)
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    if (urls.length > 2) return true;

    return false;
}

export function checkProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check for exact word matches or words embedded with common bypasses
    // This is a simple check; more advanced ones use regex for each word
    return PROFANITY_LIST.some(word => {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(lowerText) || lowerText.includes(word); // includes for non-word boundary bypasses
    });
}

export async function checkCooldown(userId: string, collectionName: string = "community"): Promise<boolean> {
    try {
        const snapshot = await db.collection(collectionName)
            .where("postedBy", "==", db.collection("users").doc(userId))
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();

        let lastPostTime = 0;

        if (snapshot.empty) {
            const snapshotString = await db.collection(collectionName)
                .where("postedBy", "==", userId)
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();

            if (!snapshotString.empty) {
                const data = snapshotString.docs[0].data();
                lastPostTime = data.createdAt?.toMillis?.() || (data.createdAt?.seconds * 1000) || 0;
            }
        } else {
            const data = snapshot.docs[0].data();
            lastPostTime = data.createdAt?.toMillis?.() || (data.createdAt?.seconds * 1000) || 0;
        }

        if (lastPostTime === 0) return true;

        const COOLDOWN_MS = 1 * 60 * 1000; // Reduced to 1 minute for better UX
        const timeSinceLastPost = Date.now() - lastPostTime;

        return timeSinceLastPost > COOLDOWN_MS;

    } catch (error) {
        console.error("Error checking cooldown:", error);
        return true;
    }
}

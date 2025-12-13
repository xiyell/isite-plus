// Assuming services/firebase.ts exists and provides db and auth
import { db, auth } from "@/services/firebase"; 
import { collection, doc, query, where, getDocs, getDoc, orderBy } from "firebase/firestore";
import { onAuthStateChanged, User } from 'firebase/auth';

// --- actions/profile.ts (New Client/Server Functions) ---

// Utility function to fetch user's Firestore profile data
export async function getProfileData(uid: string) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

// Utility function to fetch user's posts and comments counts
export async function getUserActivity(uid: string) {
    const userRef = doc(db, "users", uid);
    const q = query(
        collection(db, "community"),
        where("postedBy", "==", userRef),
        orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    const posts = querySnapshot.docs
        .filter(doc => doc.data().category !== "comment") // Assuming comments are distinct by category or structure
        .map(doc => ({ id: doc.id, ...doc.data() }));

    // This is a simplification; accurate comment counting usually requires a subcollection.
    const comments = querySnapshot.docs
        .filter(doc => doc.data().category === "comment"); 

    return {
        posts: posts,
        postCount: posts.length,
        commentCount: comments.length, 
    };
}
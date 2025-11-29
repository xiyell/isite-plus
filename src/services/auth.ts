import { User } from "@/types/user";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/services/firebase";
export function useAuth() { 
    const [user, setUser] = useState<User | null>(null);
    
    useEffect(() => {
        
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null ) => {
            if (firebaseUser) {
                
            }
        })
    })
}
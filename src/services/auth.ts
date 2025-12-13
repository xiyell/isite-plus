import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from "firebase/auth";
import { auth, db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";

export const handleSignup = async (email: string, pass: string, studentId: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
};

function normalizeRole(rawRole?: string): "guest" | "user" | "admin" {
  if (!rawRole) return "guest";
  if (rawRole === "admin") return "admin";
  return "user";
}

export function useAuth() {
  const [user, setUser] = useState<(FirebaseUser & { role?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        document.cookie = "userRole=guest; path=/; max-age=0;";
        setLoading(false);
        return;
      }

      // Load Firestore user document
      const ref = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(ref);
      const firestoreData = snap.exists() ? snap.data() : {};

      // Normalize for middleware
      const normalized = normalizeRole(firestoreData.role);

      // Save normalized role cookie
      document.cookie = `userRole=${normalized}; path=/; secure; samesite=strict`;

      setUser({
        ...firebaseUser,
        ...firestoreData,
        role: firestoreData.role,
      });

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}

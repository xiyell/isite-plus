import { User } from "@/types/user";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "@/services/firebase";

// Ensure this matches what your components expect. 
// The register component calls: handleSignup(email, password, student_id)
export const handleSignup = async (email: string, pass: string, studentId: string) => {
  // Note: studentId isn't used in the basic auth creation but passed for the API call in the component.
  // Ideally, we might want to store it in the user profile here or just return the user to let the component handle the DB save.
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
};

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return { user, loading };
}
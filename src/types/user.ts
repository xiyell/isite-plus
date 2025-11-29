import { Timestamp } from "firebase/firestore";

export interface User {
    name?: string; 
    email?: string; 
    photoURL?: string; 
    provider?: string; 
    role?: string; 
    studentId?: string; 
    uid?: string;
    bio?: string; 
    createdAt?: string;
    section?: string; 
    yearLevel?: string; 
    wallpaper?: string; 
    updatedAt?: string;

}
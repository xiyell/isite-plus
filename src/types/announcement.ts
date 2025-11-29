import { Timestamp } from "firebase/firestore";


export interface Announcement {
    id: string;
    createdAt: string; 
    description: string; 
    image:string;
    title:string; 
    updatedAt: string;
}
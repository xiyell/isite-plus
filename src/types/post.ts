import { User } from "./user";
import Comment from "./comment";
export default interface Post {
    id: string;
    title: string;
    description: string;
    category: string;
    likesCount: number;
    dislikesCount: number;
    createdAt?: string | null;
    postedBy?: User | null;
    comments: Comment[];
    image?: string;
    status?: PostStatus;
    createdAtISO?: string | null;
}

type PostStatus = "pending" | "approved" | "rejected";
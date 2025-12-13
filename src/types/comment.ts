import { User } from "./user";

export default interface Comment {
    id: string;
    text: string;
    createdAt?: string | null;
    commentedBy?: User | null;
}

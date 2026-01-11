
export interface Announcement {
    id: string;
    createdAt: string;
    description: string;
    image: string | null;
    title: string;
    updatedAt: string;
    platforms?: {
        websitePost: boolean;
        facebook: boolean;
        instagram: boolean;
        twitter: boolean;
    };
    postedBy?: {
        id: string;
        name: string;
        profilePic?: string;
        grade?: string;
        section?: string;
    } | null;
    status?: 'active' | 'deleted';
}
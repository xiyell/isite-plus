import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// GET: Fetch announcements
export async function GET() {
    try {
        const db = getAdminDb();
        const snapshot = await db.collection("announcements").orderBy("createdAt", "desc").get();
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json(announcements);
    } catch (error: any) {
        console.error("Error fetching announcements:", error);
        // Return empty array instead of error to prevent frontend crash loop if collection empty/missing
        return NextResponse.json([]);
    }
}

// POST: Create announcement
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const platformsStr = formData.get("platforms") as string;
        const image = formData.get("image") as File | null;

        if (!title || !description) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const platforms = platformsStr ? JSON.parse(platformsStr) : {};

        // Image handling would go here (upload to Storage). 
        // For now, we'll skip actual file upload and just store metadata or a placeholder URL.
        const imageUrl = image ? "https://placeholder.com/image.jpg" : "";

        const db = getAdminDb();
        const newAnnouncement = {
            title,
            description,
            platforms,
            image: imageUrl,
            createdAt: FieldValue.serverTimestamp()
        };

        await db.collection("announcements").add(newAnnouncement);

        return NextResponse.json({ message: "Announcement posted" }, { status: 201 });

    } catch (error: any) {
        console.error("Error posting announcement:", error);
        return NextResponse.json({ error: "Failed to post" }, { status: 500 });
    }
}

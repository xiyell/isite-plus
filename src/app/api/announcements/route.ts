import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth, requireAdmin } from "@/lib/auth-checks";

// GET: Fetch announcements
export async function GET() {
    try {
        // Public access allowed for viewing announcements
        // await requireAuth();

        const db = getAdminDb();
        const snapshot = await db.collection("announcements").get();
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter out deleted items in memory to handle legacy docs (missing status field)
        const activeAnnouncements = announcements.filter((a: any) => a.status !== 'deleted');

        // Sort by createdAt descending
        activeAnnouncements.sort((a: any, b: any) => {
            const tA = a.createdAt?.seconds || new Date(a.createdAt).getTime() || 0;
            const tB = b.createdAt?.seconds || new Date(b.createdAt).getTime() || 0;
            return tB - tA;
        });

        return NextResponse.json(activeAnnouncements);
    } catch (error: unknown) {
        console.error("Error fetching announcements:", error);
        if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("Forbidden"))) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json([]);
    }
}

import { checkSpam, checkProfanity } from "@/lib/moderation";

// POST: Create announcement
export async function POST(req: NextRequest) {
    try {
        await requireAdmin(); // Require Admin to create

        const formData = await req.formData();
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const platformsStr = formData.get("platforms") as string;
        const image = formData.get("image") as File | null;

        if (!title || !description) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        // Content Moderation
        const contentText = `${title} ${description}`;
        if (checkSpam(contentText)) {
            return NextResponse.json({ error: "Announcement looks like spam." }, { status: 400 });
        }
        if (checkProfanity(contentText)) {
            return NextResponse.json({ error: "Announcement contains inappropriate language." }, { status: 400 });
        }

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

    } catch (error: unknown) {
        console.error("Error posting announcement:", error);
        return NextResponse.json({ error: "Failed to post" }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { requireAuth } from "@/lib/auth-checks";
import { FieldValue } from "firebase-admin/firestore";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Params are async in Next.js 15
) {
    try {
        const session = await requireAuth();
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Announcement ID required" }, { status: 400 });
        }

        const db = getAdminDb();
        const ref = db.collection("announcements").doc(id);

        // Soft Delete
        await ref.update({
            isDeleted: true,
            status: "deleted",
            deletedAt: FieldValue.serverTimestamp(),
            deletedBy: session.uid, // Track who deleted it
            deletedByRole: session.role
        });

        return NextResponse.json({ message: "Announcement moved to trash" });

    } catch (error: unknown) {
        console.error("Error deleting announcement:", error);
        if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("Forbidden"))) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}

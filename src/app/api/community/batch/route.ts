import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { requireAdmin } from "@/lib/auth-checks";

// POST: Batch approve or reject posts
export async function POST(req: NextRequest) {
    try {
        await requireAdmin();

        const body = await req.json();
        const { postIds, action } = body;

        if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
            return NextResponse.json({ error: "Missing postIds" }, { status: 400 });
        }
        if (action !== "approve" && action !== "reject") {
            return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'." }, { status: 400 });
        }

        const db = getAdminDb();
        const batch = db.batch();

        postIds.forEach((id: string) => {
            const ref = db.collection("community").doc(id);
            if (action === "reject") {
                batch.update(ref, {
                    status: "deleted",
                    isDeleted: true,
                    deletedAt: Date.now()
                });
            } else {
                batch.update(ref, { status: "approved" });
            }
        });

        await batch.commit();

        return NextResponse.json({
            message: `Successfully ${action === "approve" ? "approved" : "rejected"} ${postIds.length} posts.`
        });

    } catch (error: unknown) {
        console.error("Batch moderation error:", error);
        if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("Forbidden"))) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Batch operation failed" }, { status: 500 });
    }
}

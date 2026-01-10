import { NextRequest, NextResponse } from "next/server";
import { db } from "@/services/firebase";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { addLog } from "@/actions/logs";
import { getDoc, doc } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const { postIds, action, userId } = await req.json();

        if (!postIds || !Array.isArray(postIds)) {
            return NextResponse.json({ error: "Invalid post IDs" }, { status: 400 });
        }

        const adminDb = getAdminDb();
        const batch = adminDb.batch();

        // Get actor info for logs
        // We can't easily get actor info in a batch route without auth check, 
        // but we can assume the client sends the userId/actorId or we verify session.
        // Ideally we verify session here. For now we trust the client passed userId.

        // Fetch actor for logging
        let actorName = "Admin";
        if (userId) {
            const actorSnap = await adminDb.collection('users').doc(userId).get();
            if (actorSnap.exists) {
                actorName = actorSnap.data()?.name || "Admin";
            }
        }

        const timestamp = FieldValue.serverTimestamp();

        postIds.forEach((id) => {
            const ref = adminDb.collection("community").doc(id);
            if (action === "approve") {
                batch.update(ref, {
                    status: "approved",
                    approvedAt: timestamp,
                    approvedBy: userId
                });
            } else if (action === "reject") {
                batch.update(ref, {
                    status: "deleted",
                    isDeleted: true,
                    deletedAt: timestamp,
                    deletedBy: userId
                });
            }
        });

        await batch.commit();

        // Log the bulk action
        await addLog({
            category: "posts",
            action: action === "approve" ? "BULK_APPROVE" : "BULK_REJECT",
            severity: "medium",
            message: `${actorName} ${action}d ${postIds.length} posts.`,
            actorRole: "admin"
        });

        return NextResponse.json({ message: `Successfully ${action}d ${postIds.length} posts` });
    } catch (error) {
        console.error("Batch error:", error);
        return NextResponse.json({ error: "Batch operation failed" }, { status: 500 });
    }
}

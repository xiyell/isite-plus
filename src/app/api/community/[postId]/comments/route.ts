import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
    try {
        const { postId } = await params;
        const body = await req.json();
        const { text, commentedBy, createdAt } = body;

        if (!text || !commentedBy) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const db = getAdminDb();
        const newComment = {
            text,
            commentedBy: db.collection("users").doc(commentedBy), // store as ref
            createdAt: createdAt ? new Date(createdAt) : FieldValue.serverTimestamp(),
        };

        const commentsRef = db.collection("community").doc(postId).collection("comments");
        const res = await commentsRef.add(newComment);

        return NextResponse.json({ id: res.id, message: "Comment added" }, { status: 201 });

    } catch (error: unknown) {
        console.error("Error adding comment:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to add comment" }, { status: 500 });
    }
}

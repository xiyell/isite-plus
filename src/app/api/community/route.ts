import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// GET: Fetch posts (can filter by status via query param)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status"); // e.g., 'pending' or 'approved' (default: all if not specified)

        // Community collections
        // Community collections
        const db = getAdminDb();
        const postsRef = db.collection("community");
        let q: FirebaseFirestore.Query = postsRef; // Note: Removed orderBy to avoid index requirement for new status filter

        if (status) {
            q = q.where("status", "==", status);
        }

        const snapshot = await q.get();
        // Sort in memory instead
        const posts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => {
                const tA = a.createdAt?.seconds || 0; // handle Firestore Timestamp
                const tB = b.createdAt?.seconds || 0;
                // If dates are strings or Dates in some cases
                const vA = tA || new Date(a.createdAt).getTime() || 0;
                const vB = tB || new Date(b.createdAt).getTime() || 0;
                return vB - vA;
            });

        return NextResponse.json(posts);
    } catch (error: unknown) {
        console.error("Error fetching posts:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to fetch posts" }, { status: 500 });
    }
}

// POST: Create a new post
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, category, image, postedBy, createdAt, status } = body;

        if (!title || !description || !postedBy) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const db = getAdminDb();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newPost: any = {
            title,
            description,
            category: category || "General",
            image: image || "",
            postedBy: db.doc(`users/${postedBy}`),
            likesCount: 0,
            dislikesCount: 0,
            createdAt: createdAt ? new Date(createdAt) : FieldValue.serverTimestamp(),
            status: status || "pending",
        };

        // If postedBy is just a string UID, make it a ref
        if (typeof postedBy === 'string') {
            newPost.postedBy = db.collection('users').doc(postedBy);
        }

        const res = await db.collection("community").add(newPost);

        return NextResponse.json({ id: res.id, message: "Post created successfully" }, { status: 201 });
    } catch (error: unknown) {
        console.error("Error creating post:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to create post" }, { status: 500 });
    }
}

// PATCH: Update post (Approve/Reject OR Like/Dislike)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { postId, action, type, userId } = body;
        const db = getAdminDb();
        const postRef = db.collection("community").doc(postId);

        if (!postId) {
            return NextResponse.json({ error: "Missing Post ID" }, { status: 400 });
        }

        // 1. Admin Actions
        if (action === "approve") {
            await postRef.update({ status: "approved" });
            return NextResponse.json({ message: "Post approved" });
        }
        if (action === "reject") {
            await postRef.update({ status: "rejected" });
            return NextResponse.json({ message: "Post rejected" });
        }

        // 2. Like/Dislike Actions
        if (type === "like" || type === "dislike") {
            const increment = FieldValue.increment(type === "like" ? 1 : -1);
            await postRef.update({
                likesCount: increment
            });
            return NextResponse.json({ message: "Post updated" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: unknown) {
        console.error("Error updating post:", error);
        return NextResponse.json({ error: (error as Error).message || "Failed to update post" }, { status: 500 });
    }
}

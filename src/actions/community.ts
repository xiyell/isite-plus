"use server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import Post from "@/types/post";
import { User } from "@/types/user";
import Comment from "@/types/comment";
import { addLog, getActorDisplayName } from "./logs"; // Import helper
import { checkProfanity, checkSpam } from "@/lib/moderation";
import { revalidatePath } from "next/cache";

// --- Type Helpers for Firestore Data ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertFirestoreTimestamp = (timestamp: any): string | null => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  return null;
};

// The heavy lifting of fetching posts and their nested data (Users/Comments)
// This is done once on the server and returned as a clean Post[] array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchPostData(docSnap: FirebaseFirestore.QueryDocumentSnapshot): Promise<Post> {
  const post = docSnap.data();
  const db = getAdminDb();

  /* ───── HELPER: SANITIZE USER ───── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitizeUser = (id: string, data: any): User => {
    return {
      uid: id,
      name: data.name,
      email: data.email,
      photoURL: data.photoURL,
      provider: data.provider,
      role: data.role,
      studentId: data.studentId,
      bio: data.bio,
      section: data.section,
      yearLevel: data.yearLevel,
      wallpaper: data.wallpaper,
      createdAt: convertFirestoreTimestamp(data.createdAt) || undefined,
      updatedAt: convertFirestoreTimestamp(data.updatedAt) || undefined,
    };
  };

  /* ───── POSTER ───── */
  let postedByUser: User | null = null;

  // In Admin SDK, references are stored as DocumentReference
  if (post.postedBy && typeof post.postedBy.get === 'function') {
    try {
      const userRef = post.postedBy as FirebaseFirestore.DocumentReference;
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        postedByUser = sanitizeUser(userSnap.id, userSnap.data());
      }
    } catch (e) {
      console.error("Error fetching poster:", e);
    }
  } else if (typeof post.postedBy === 'string') {
    // Handle legacy string refs if any
    const userSnap = await db.collection('users').doc(post.postedBy).get();
    if (userSnap.exists) {
        postedByUser = sanitizeUser(userSnap.id, userSnap.data());
    }
  }

  /* ───── COMMENTS ───── */
  const commentsRef = db.collection("community").doc(docSnap.id).collection("comments");
  const commentsSnap = await commentsRef.orderBy("createdAt", "asc").get();

  const comments: Comment[] = await Promise.all(
    commentsSnap.docs.map(async (cSnap) => {
      const cData = cSnap.data();
      let commentedByUser: User | null = null;

      if (cData.commentedBy && typeof cData.commentedBy.get === 'function') {
        try {
          const userRef = cData.commentedBy as FirebaseFirestore.DocumentReference;
          const userSnap = await userRef.get();
          if (userSnap.exists) {
            commentedByUser = sanitizeUser(userSnap.id, userSnap.data());
          }
        } catch (e) {
          console.error("Error fetching comment user:", e);
        }
      }

      return {
        id: cSnap.id,
        text: cData.text,
        createdAt: convertFirestoreTimestamp(cData.createdAt),
        commentedBy: commentedByUser ?? { name: "Anonymous" },
      };
    })
  );

  return {
    id: docSnap.id,
    title: post.title,
    description: post.description,
    category: post.category,
    likesCount: post.likesCount ?? 0,
    dislikesCount: post.dislikesCount ?? 0,
    createdAt: convertFirestoreTimestamp(post.createdAt),
    postedBy: postedByUser ?? { name: "Anonymous" },
    comments,
    image: post.image ?? "",
    status: post.status ?? "approved",
  };
}


// -----------------------------------------------------------------
// 1. FETCH POSTS ACTION
// -----------------------------------------------------------------

export async function getCommunityPosts(): Promise<Post[]> {
  const db = getAdminDb();
  const postsRef = db.collection("community");
  // Fetching all documents ordered by creation date
  const snapshot = await postsRef.orderBy("createdAt", "desc").get();

  // Use Promise.all to fetch nested data (User and Comments) concurrently
  const posts = await Promise.all(
    snapshot.docs.map(fetchPostData)
  );

  return posts;
}

// Fetch all posts for Admin Dashboard (Bypasses Client Rules)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAllPostsForModeration(): Promise<any[]> {
  const db = getAdminDb();
  // Fetch ALL posts to avoid index issues with complex filters
  const snapshot = await db.collection("community").get();

  const posts = await Promise.all(snapshot.docs.map(async (doc) => {
    const d = doc.data();
    
    return {
      id: doc.id,
      authorId: (typeof d.postedBy === 'string' ? d.postedBy : d.postedBy?.id) || "unknown",
      authorUsername: d.authorName || "User",
      title: d.title || "",
      description: d.description || "",
      category: d.category || "General",
      status: d.status || "pending",
      createdAt: convertFirestoreTimestamp(d.createdAt)
    };
  }));

  return posts;
}


// -----------------------------------------------------------------
// 2. CREATE POST ACTION
// -----------------------------------------------------------------

export interface NewPostData {
  title: string;
  description: string;
  category: string;
  image: string;
  postedBy: string; // Assuming UID string
  status: "pending" | "approved" | "rejected" | "deleted";
}

export async function createCommunityPost(data: NewPostData) {
  const db = getAdminDb();
  const { postedBy, ...rest } = data;

  const postedByRef = db.collection('users').doc(postedBy);
  const userSnap = await postedByRef.get();
  const user = userSnap.data();
  const actorName = await getActorDisplayName(postedBy);

  // --- AUTOMATED MODERATION ---
  const isProfane = checkProfanity(data.title) || checkProfanity(data.description);
  const isSpam = checkSpam(data.title) || checkSpam(data.description);
  
  let finalStatus: "pending" | "approved" | "rejected" | "deleted" = data.status;
  let moderationReason = "";

  if (isProfane || isSpam) {
    finalStatus = "deleted";
    moderationReason = isProfane ? "Blocked: Profanity detected." : "Blocked: Spam pattern detected.";
  }

  const postDoc = {
    ...rest,
    status: finalStatus,
    moderationNote: moderationReason,
    deletedAt: finalStatus === "deleted" ? FieldValue.serverTimestamp() : null,
    postedBy: postedByRef,
    authorName: user?.name || "Anonymous",
    likesCount: 0,
    dislikesCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection("community").add(postDoc);

  if (finalStatus === "deleted") {
    await addLog({
      category: "posts",
      action: "AUTO_DELETE_POST",
      severity: "medium",
      actorRole: "system",
      actorName: "System",
      message: `System auto-deleted post from ${actorName}: "${data.title}". Reason: ${moderationReason}`,
    });
    return { success: false, message: moderationReason };
  }

  await addLog({
    category: "posts",
    action: "CREATE_POST",
    severity: "low",
    actorRole: user?.role,
    actorName: actorName,
    message: `User ${actorName} created a new post: "${data.title}"`,
  });

  return { success: true };
}

export async function updateCommunityPost(postId: string, data: Partial<NewPostData>, actorUid: string) {
    const db = getAdminDb();
    const postRef = db.collection("community").doc(postId);
    const actorRef = db.collection("users").doc(actorUid);
    
    const [postSnap, actorSnap] = await Promise.all([
        postRef.get(),
        actorRef.get()
    ]);

    if (!postSnap.exists) throw new Error("Post not found.");
    const originalPost = postSnap.data();
    const actor = actorSnap.data();
    const actorName = await getActorDisplayName(actorUid);

    // Moderation Check on Edited Content
    const titleToCheck = data.title || originalPost?.title || "";
    const descriptionToCheck = data.description || originalPost?.description || "";
    
    const isProfane = checkProfanity(titleToCheck) || checkProfanity(descriptionToCheck);
    const isSpam = checkSpam(titleToCheck) || checkSpam(descriptionToCheck);

    let finalStatus = data.status || originalPost?.status || "pending";
    let moderationReason = "";

    if (isProfane || isSpam) {
        finalStatus = "deleted";
        moderationReason = isProfane ? "Blocked: Profanity detected." : "Blocked: Spam pattern detected.";
    } else if (finalStatus === "deleted") {
        // If it was deleted but now it's clean (and being edited), maybe keep it pending?
        // Usually, if a user edits a deleted/rejected post, it goes back to pending.
        finalStatus = "approved"; // Default auto-approve if clean? User said "to be approved if it has no profanity"
    }

    const updateData = {
        ...data,
        status: finalStatus,
        moderationNote: moderationReason,
        updatedAt: FieldValue.serverTimestamp(),
    };

    await postRef.update(updateData);

    await addLog({
        category: "posts",
        action: "UPDATE_POST",
        severity: "low",
        actorRole: actor?.role,
        actorName: actorName,
        message: `User ${actorName} updated post: "${titleToCheck}". Status: ${finalStatus}`,
    });

    return { success: true, status: finalStatus, message: moderationReason };
}


export async function updatePostLikeStatus(postId: string, userId: string, action: 'like' | 'dislike') {
  const db = getAdminDb();
  const postRef = db.collection("community").doc(postId);

  const postSnap = await postRef.get();
  if (!postSnap.exists) throw new Error("Post not found.");

  const currentLikedBy: string[] = postSnap.data()?.likedBy || [];
  const isCurrentlyLiked = currentLikedBy.includes(userId);

  let newLikesCount = postSnap.data()?.likesCount || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let updateData: any = {};

  if (action === 'like' && !isCurrentlyLiked) {
    newLikesCount += 1;
    updateData = {
      likesCount: newLikesCount,
      likedBy: FieldValue.arrayUnion(userId)
    };
  } else if (action === 'dislike' && isCurrentlyLiked) {
    newLikesCount -= 1;
    updateData = {
      likesCount: newLikesCount,
      likedBy: FieldValue.arrayRemove(userId)
    };
  } else {
    return;
  }

  await postRef.update(updateData);

  // --- KARMA UPDATE START ---
  // Update the post author's karma
  try {
    const postData = postSnap.data();
    if (postData?.postedBy) {
      let authorRef: FirebaseFirestore.DocumentReference | null = null;
      
      if (typeof postData.postedBy.update === 'function') {
        // It's a reference
        authorRef = postData.postedBy as FirebaseFirestore.DocumentReference;
      } else if (typeof postData.postedBy === 'string') {
        // It's a string ID
        authorRef = db.collection('users').doc(postData.postedBy);
      }

      if (authorRef) {
        const karmaChange = action === 'like' ? 1 : -1;
        // Only update if it's a new like/dislike (which we established above)
        // If we are just toggling, the math above handles newLikesCount but we need to verify logic.
        // The original logic checks: if (action === 'like' && !isCurrentlyLiked) ...
        // So we are inside that confirmed block, but we are AFTER the blocks.
        // Let's perform the increment carefully.
        
        await authorRef.update({
          karma: FieldValue.increment(karmaChange)
        });
      }
    }
  } catch (error) {
    console.error("Failed to update author karma:", error);
    // Don't fail the whole action just because karma failed
  }
  // --- KARMA UPDATE END ---
}


// -----------------------------------------------------------------
// 4. COMMENT ACTION
// -----------------------------------------------------------------

export interface NewCommentData {
  postId: string;
  commentedBy: string; // Assuming UID string
  text: string;
}

export async function addCommunityComment(data: NewCommentData) {
  const db = getAdminDb();
  const { postId, commentedBy, text } = data;

  // Create a reference for the post document
  const postRef = db.collection("community").doc(postId);

  const commentedByRef = db.collection('users').doc(commentedBy);
  const user = (await commentedByRef.get()).data();
  const actorName = await getActorDisplayName(commentedBy);

  // --- AUTOMATED MODERATION ---
  if (checkProfanity(text) || checkSpam(text)) {
    throw new Error("Comment rejected: Profanity or spam detected.");
  }

  // Add comment to the subcollection
  await postRef.collection("comments").add({
    text: text,
    commentedBy: commentedByRef, // Stored as a DocumentReference
    createdAt: FieldValue.serverTimestamp(),
  });

  const postSnap = await postRef.get();
  const postTitle = postSnap.data()?.title || "Unknown Post";

  await addLog({
    category: "posts",
    action: "CREATE_COMMENT",
    severity: "low",
    actorRole: user?.role,
    actorName: actorName,
    message: `User ${actorName} commented on "${postTitle}"`,
  });
}


// -----------------------------------------------------------------
// 5. ADMIN ACTIONS
// -----------------------------------------------------------------

export async function updatePostStatus(postId: string, status: 'approved' | 'rejected') {
  const db = getAdminDb();
  const postRef = db.collection("community").doc(postId);

  await postRef.update({
    status: status,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function movePostToRecycleBin(postId: string, actorUid: string) {
  const db = getAdminDb();
  const postRef = db.collection("community").doc(postId);
  const userRef = db.collection("users").doc(actorUid);

  const userSnap = await userRef.get();
  const user = userSnap.data();
  const actorName = await getActorDisplayName(actorUid);

  await postRef.update({
    status: "deleted",
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: userRef,
  });

  const postSnap = await postRef.get();
  const postTitle = postSnap.data()?.title || "Unknown Post";

  await addLog({
    category: "posts",
    action: "MOVE_TO_RECYCLE_BIN",
    severity: "medium",
    actorRole: user?.role,
    actorName: actorName,
    message: `Post "${postTitle}" was moved to recycle bin by ${actorName}`,
  });
}

// -----------------------------------------------------------------
// 6. PROFILE ACTIVITY
// -----------------------------------------------------------------

export async function getUserActivity(userId: string): Promise<{ posts: Post[], comments: Comment[], indexError?: boolean }> {
  const db = getAdminDb();
  const userRef = db.collection("users").doc(userId);

  // Run 4 queries in parallel to cover both Reference and String storage patterns
  const [
    postsRefSnap, 
    postsStrSnap
  ] = await Promise.all([
    db.collection("community").where("postedBy", "==", userRef).get(),
    db.collection("community").where("postedBy", "==", userId).get(),
  ]);

  let indexError = false;

  // Fetch comments separately to prevent index errors from blocking posts
  const [commentsRefSnap, commentsStrSnap] = await Promise.allSettled([
    db.collectionGroup("comments").where("commentedBy", "==", userRef).get(),
    db.collectionGroup("comments").where("commentedBy", "==", userId).get(),
  ]).then(results => {
    results.forEach((r, index) => {
        if (r.status === 'rejected') {
            console.error(`getUserActivity: Comment query ${index} failed. Possible missing Collection Group Index.`, r.reason);
            // Check if error message is related to indexes
            if (String(r.reason).includes('index')) {
                indexError = true;
            }
        }
    });
    return results.map(r => r.status === 'fulfilled' ? r.value : { docs: [] as any[] });
  });

  // --- Deduplicate Posts ---
  const postsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  postsRefSnap.docs.forEach(d => postsMap.set(d.id, d));
  postsStrSnap.docs.forEach(d => postsMap.set(d.id, d));

  const posts: Post[] = (await Promise.all(
    Array.from(postsMap.values()).map(fetchPostData)
  )).filter(post => ['approved', 'active'].includes((post.status || 'approved').toLowerCase()));

  // --- Deduplicate Comments ---
  const commentsMap = new Map<string, any>(); 
  commentsRefSnap.docs.forEach(d => commentsMap.set(d.id, d));
  commentsStrSnap.docs.forEach(d => commentsMap.set(d.id, d));

  // 1. Map comments to temporary objects with parent IDs
  const tempComments = Array.from(commentsMap.values()).map(doc => {
      // For a subcollection "community/{postId}/comments/{commentId}", 
      // parent is "comments" (CollectionReference), parent.parent is "community/{postId}" (DocumentReference)
      const parentPostRef = doc.ref.parent.parent; 
      return {
          doc,
          postId: parentPostRef ? parentPostRef.id : null
      };
  });

  // 2. Collect unique Post IDs to fetch
  const postIdsToCheck = new Set<string>();
  tempComments.forEach(c => {
      if (c.postId) postIdsToCheck.add(c.postId);
  });

  // 3. Batch fetch parent posts to check status
  const validPostIds = new Set<string>();
  
  if (postIdsToCheck.size > 0) {
      const postIdsArray = Array.from(postIdsToCheck);
      const refs = postIdsArray.map(id => db.collection('community').doc(id));
      
      try {
        const postSnapshots = await db.getAll(...refs);
        postSnapshots.forEach(snap => {
            // Check if post exists and is NOT deleted
            if (snap.exists && ['approved', 'active'].includes(snap.data()?.status?.toLowerCase())) {
                validPostIds.add(snap.id);
            }
        });
      } catch (error) {
          console.error("Error batch fetching parent posts for comments:", error);
          // In case of error, we might choose to show all or none. 
          // Safest to show none to avoid showing deleted content, or show all if critical.
          // Let's assume none for safety.
      }
  }

  // 4. Filter and Map final comments
  const comments: Comment[] = tempComments
      .filter(item => item.postId && validPostIds.has(item.postId))
      .map(({ doc }) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || "",
          createdAt: convertFirestoreTimestamp(data.createdAt),
          commentedBy: { uid: userId } 
        };
      });

  return { posts, comments, indexError };
}

export async function deleteCommunityComment(postId: string, commentId: string, userId: string) {
  const db = getAdminDb();
  const postRef = db.collection("community").doc(postId);
  const commentRef = postRef.collection("comments").doc(commentId);

  const commentSnap = await commentRef.get();
  if (!commentSnap.exists) {
    throw new Error("Comment not found.");
  }

  const commentData = commentSnap.data();
  // Check if user is the author or an admin
  // For simplicity, we check equality of ID.
  // Comment author handling:
  let authorId = "";
  if (commentData?.commentedBy) {
     if (typeof commentData.commentedBy === 'string') {
         authorId = commentData.commentedBy;
     } else if (typeof commentData.commentedBy.id === 'string') {
          // DocumentReference
         authorId = commentData.commentedBy.id;
     }
  }

  // Also allow admins (fetch user role if needed, but for now strict ownership)
  // If we need admin override, we'd need to fetch the requesting user's role.
  // Assuming the UI prevents non-owners from calling this unless we want strong security here.
  // Let's add basic ownership check.
  
  if (authorId !== userId) {
      // Check if user is admin
      const userDoc = await db.collection("users").doc(userId).get();
      const role = userDoc.data()?.role;
      if (role !== 'admin' && role !== 'superadmin' && role !== 'moderator') {
          throw new Error("Unauthorized to delete this comment.");
      }
  }

  await commentRef.delete();
  
  return { success: true };
}

// -----------------------------------------------------------------
// 7. STATS ACTION
// -----------------------------------------------------------------

export async function getCommunityStats() {
  const db = getAdminDb();
  const snapshot = await db.collection("community").get();
  
  let total = 0;
  let approved = 0;
  let pending = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const status = (data.status || 'approved').toString().toLowerCase();
    
    if (status !== 'deleted' && status !== 'rejected') {
      total++;
      if (status === 'approved' || status === 'active') approved++; // Support both active/approved aliases
      if (status === 'pending') pending++;
    }
  });

  return { total, approved, pending };
}

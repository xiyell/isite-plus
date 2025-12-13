"use server";
import { db } from "@/services/firebase";
import Post from "@/types/post"; // Assuming this path
import { User } from "@/types/user"; // Assuming this path
import Comment from "@/types/comment"; // Assuming this path
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  limit as firestoreLimit,
  DocumentReference,
} from "firebase/firestore";

// --- Type Helpers for Firestore Data ---
const convertFirestoreTimestamp = (timestamp: any): string | null => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  return null;
};

// The heavy lifting of fetching posts and their nested data (Users/Comments)
// This is done once on the server and returned as a clean Post[] array.
async function fetchPostData(docSnap: any): Promise<Post> {
  const post = docSnap.data();

  /* ───── POSTER ───── */
  let postedByUser: User | null = null;

  if (post.postedBy instanceof DocumentReference) {
    const userSnap = await getDoc(post.postedBy);
    if (userSnap.exists()) {
      postedByUser = {
        uid: userSnap.id,
        ...(userSnap.data() as User),
      };
    }
  }

  /* ───── COMMENTS ───── */
  const commentsSnap = await getDocs(
    query(
      collection(db, "community", docSnap.id, "comments"),
      orderBy("createdAt", "asc")
    )
  );

  const comments: Comment[] = await Promise.all(
    commentsSnap.docs.map(async (cSnap) => {
      const cData = cSnap.data();
      let commentedByUser: User | null = null;

      if (cData.commentedBy instanceof DocumentReference) {
        const userSnap = await getDoc(cData.commentedBy);
        if (userSnap.exists()) {
          commentedByUser = {
            uid: userSnap.id,
            ...(userSnap.data() as User),
          };
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
  const postsRef = collection(db, "community");
  // Fetching all documents ordered by creation date
  const q = query(postsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  // Use Promise.all to fetch nested data (User and Comments) concurrently
  const posts = await Promise.all(
    snapshot.docs.map(fetchPostData)
  );

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
    status: "pending" | "approved" | "rejected";
}

export async function createCommunityPost(data: NewPostData) {
  const { postedBy, ...rest } = data;
  

  const postedByRef = doc(db, 'users', postedBy);
  
  await addDoc(collection(db, "community"), {
    ...rest,
    postedBy: postedByRef, 
    likesCount: 0,
    dislikesCount: 0,
    createdAt: serverTimestamp(),
  });
}


export async function updatePostLikeStatus(postId: string, userId: string, action: 'like' | 'dislike') {
  const postRef = doc(db, "community", postId);
  

  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) throw new Error("Post not found.");
  
  const currentLikedBy: string[] = postSnap.data().likedBy || [];
  const isCurrentlyLiked = currentLikedBy.includes(userId);
  
  let newLikesCount = postSnap.data().likesCount || 0;
  let updateData: any = {};
  
  if (action === 'like' && !isCurrentlyLiked) {
    newLikesCount += 1;
    updateData = {
      likesCount: newLikesCount,
      likedBy: arrayUnion(userId)
    };
  } else if (action === 'dislike' && isCurrentlyLiked) {
    newLikesCount -= 1;
    updateData = {
      likesCount: newLikesCount,
      likedBy: arrayRemove(userId)
    };
  } else {
    // Action already performed or is redundant
    return;
  }

  await updateDoc(postRef, updateData);
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
  const { postId, commentedBy, text } = data;
  
  // Create a reference for the post document
  const postRef = doc(db, "community", postId);

  // NOTE: If you store commentedBy as a Firestore Document Reference, use:
  const commentedByRef = doc(db, 'users', commentedBy);
  
  // Add comment to the subcollection
  await addDoc(collection(postRef, "comments"), {
    text: text,
    commentedBy: commentedByRef, // Stored as a DocumentReference
    createdAt: serverTimestamp(),
  });
  
  // Optional: Update the comment count on the main post (for better queries/denormalization)
  // await updateDoc(postRef, {
  //   commentCount: increment(1)
  // });
}


// -----------------------------------------------------------------
// 5. ADMIN ACTIONS
// -----------------------------------------------------------------

export async function updatePostStatus(postId: string, status: 'approved' | 'rejected') {
  const postRef = doc(db, "community", postId);

  await updateDoc(postRef, {
    status: status,
    updatedAt: serverTimestamp(),
  });
}
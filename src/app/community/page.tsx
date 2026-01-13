"use client";

import { useState, useEffect } from "react";
import {
  getCommunityPosts,
  createCommunityPost,
  updatePostLikeStatus,
  addCommunityComment,
  updatePostStatus,
  updateCommunityPost,
  NewPostData,
  NewCommentData,
  deleteCommunityComment,
} from "@/actions/community";
import { movePostToRecycleBin } from "@/actions/community";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

// Shadcn/ui Toast Imports
import { useToast } from "@/components/ui/use-toast"; // <-- NEW IMPORT
import { ToastAction } from "@/components/ui/toast";

// Icons
import {
  ChevronDown,
  Heart,
  MessageCircle,
  Loader2,
  Clock,
  UserCircle,
  BarChart2,
  Trash2,
  MoreVertical,
  Search,
  Edit,
} from "lucide-react";

// Firebase/Data Imports
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, limit } from "firebase/firestore";

// Type Imports
import Post from "@/types/post";
import Comment from "@/types/comment";
import { User } from "@/types/user";

// --- Configuration Constants ---
const categories = ["All", "Tech", "Gaming", "Art", "Science", "Fun", "Other"];
const ADMIN_UIDS: string[] = []; 
const postsPerPage = 8;
const commentsPerPage = 5;

// --- Helper Functions ---
function formatDate(date: any) {
  if (!date) return "Unknown date";
  try {
    if (
      typeof date === "object" &&
      "_seconds" in date &&
      typeof date._seconds === "number"
    ) {
      return new Date(date._seconds * 1000).toLocaleDateString();
    }
    if (
      typeof date === "object" &&
      "seconds" in date &&
      typeof date.seconds === "number"
    ) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  } catch {
    return "Unknown date";
  }
}

const getPageWindow = (current: number, total: number, maxButtons = 5) => {
  if (total <= maxButtons)
    return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + maxButtons - 1);

  if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};
// ... (rest of file until DialogHeader)
// This replacement is tricky because formatDate is far from DialogHeader. 
// I will split this into two replacements. Can I?
// "Do NOT make multiple parallel calls...".
// "Use multi_replace_file_content".
// I will use multi_replace_file_content.


// --- Component Start ---
export default function CommunityPage() {
  // --- Initialize Toast Hook ---
  const { toast } = useToast(); // <-- NEW: Initialize toast

  // --- State Declarations (rest of state is unchanged) ---
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Top");
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [isPostLoading, setIsPostLoading] = useState(false);
  const [postPage, setPostPage] = useState(1);
  const [loadingPagePosts, setLoadingPagePosts] = useState(false);
  const [loadingPageComments, setLoadingPageComments] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    name: string;
    role?: string;
  } | null>(null);

  // Create Post Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState(categories[1] || "Tech");
  const [creating, setCreating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // User Search State
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [isUserSearching, setIsUserSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Dynamic Tailwind classes
  const GLASSY_CARD_CLASSES =
    "rounded-[2rem] border border-white/10 bg-zinc-950/40 backdrop-blur-md text-white p-8 overflow-hidden transition-all hover:border-fuchsia-500/50 shadow-2xl hover:shadow-fuchsia-500/10";
  const GLASSY_MODAL_CLASSES =
    "max-w-xl p-8 sm:p-10 overflow-y-auto max-h-[90vh] rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl text-white shadow-2xl";
  const GLASSY_BUTTON_OUTLINE =
    "gap-2 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/40 transition-all backdrop-blur-sm"; // More subtle glass
  const GLASSY_BUTTON_GHOST =
    "text-white/80 hover:bg-white/10 hover:text-white rounded-full";
  // Updated Inputs to be cleaner
  const GLASSY_INPUT_CLASSES =
    "flex-1 rounded-full px-4 py-2 border-white/20 bg-white/5 text-white placeholder:text-white/50 focus-visible:ring-fuchsia-500 focus-visible:border-fuchsia-500 transition-all";
  const GLASSY_TEXTAREA_CLASSES =
    "w-full min-h-[120px] rounded-xl p-4 bg-white/5 border border-white/20 text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:border-transparent transition-all";
  const GLASSY_COMMENT_BG = "bg-white/5 border border-white/10";
  const GLASSY_SEPARATOR = "bg-white/10";


  // --- Data Fetching Logic (Uses Server Action) ---
  const fetchPosts = async (): Promise<Post[]> => {
    setIsLoading(true);
    try {
      const data = await getCommunityPosts();
      setPosts(data);
      return data;
    } catch (err) {
      console.error("Error fetching posts:", err);
      toast({
        title: "Error fetching posts",
        description: "Could not load the community feed. Please try refreshing.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const updateOpenPostData = (updatedPosts: Post[]) => {
    if (openPost) {
      const updatedPost = updatedPosts.find((p) => p.id === openPost.id);
      if (updatedPost) {
        setOpenPost(updatedPost);
      }
    }
  };

  // --- Effects (unchanged) ---
  useEffect(() => {
    fetchPosts();
  }, []);

  // Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user details including role
        try {
           // We need to import doc and getDoc from firebase/firestore where db is defined
           // But db is imported from services/firebase
           // Let's assume we can use the client SDK here since we are in a client component
           const { doc, getDoc } = await import("firebase/firestore"); 
           const { db } = await import("@/services/firebase");
           
           const userDoc = await getDoc(doc(db, "users", user.uid));
           const userData = userDoc.data();
           
           setCurrentUser({
            uid: user.uid,
            name: userData?.name || user.displayName || "Anonymous",
            role: userData?.role || "user",
          });
        } catch (e) {
          console.error("Error fetching user role", e);
          setCurrentUser({
            uid: user.uid,
            name: user.displayName || "Anonymous",
            role: "user",
          });
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsub();
  }, []);

  // User Search Logic (Debounced)
  useEffect(() => {
    if (!userSearchTerm.trim()) {
      setUserSearchResults([]);
      setShowResults(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsUserSearching(true);
      setShowResults(true);
      try {
        const usersRef = collection(db, "users");
        const term = userSearchTerm.trim();
        
        // Strategy: Multiple queries to cover different cases since Firestore is case-sensitive
        // and doesn't support 'OR' easily without composite indexes or separate calls.
        
        const namePrefix = term;
        const nameCapitalized = term.charAt(0).toUpperCase() + term.slice(1);
        const nameAllUpper = term.toUpperCase();
        
        const queries = [
          // Search by Name (Original)
          query(usersRef, where("name", ">=", namePrefix), where("name", "<=", namePrefix + "\uf8ff"), limit(3)),
          // Search by Name (Capitalized)
          query(usersRef, where("name", ">=", nameCapitalized), where("name", "<=", nameCapitalized + "\uf8ff"), limit(3)),
          // Search by Student ID
          query(usersRef, where("studentId", ">=", term), where("studentId", "<=", term + "\uf8ff"), limit(5))
        ];
        
        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        const resultMap = new Map<string, User>();
        
        snapshots.forEach(snapshot => {
          snapshot.forEach((doc) => {
            const data = doc.data() as User;
            resultMap.set(doc.id, { uid: doc.id, ...data });
          });
        });
        
        setUserSearchResults(Array.from(resultMap.values()).slice(0, 8));
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setIsUserSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchTerm]);

  const isAdmin = currentUser ? currentUser.role === 'admin' || currentUser.role === 'moderator' : false;

  // --- Filtering and Sorting (Client-Side) ---
  const filteredAndSortedPosts = posts
    .filter((c) => {
      // 🚫 Always hide deleted and rejected posts in normal community view
      if (c.status === "deleted" || c.status === "rejected") return false;

      // 👤 Non-admins see only approved posts, UNLESS it's their own pending post
      if (!isAdmin) {
        if (c.status !== "approved" && c.postedBy?.uid !== currentUser?.uid) return false;
      }

      // 👑 Admins/Users filter by category
      return selectedCategory === "All" || c.category === selectedCategory;
    })
    .sort((a, b) => {
      if (sortBy === "Top") {
        // Sort by likes (descending)
        return b.likesCount - a.likesCount;
      } else {
        // Sort by creation date (Newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
    });

  // --- Pagination Logic (Client-Side) ---
  const totalPostPages = Math.max(1, Math.ceil(filteredAndSortedPosts.length / postsPerPage));
  const startPostIndex = (postPage - 1) * postsPerPage;
  const paginatedPosts = filteredAndSortedPosts.slice(
    startPostIndex,
    startPostIndex + postsPerPage
  );

  // Reset page if filters change and current page is invalid
  useEffect(() => {
    if (postPage > totalPostPages && totalPostPages > 0) {
      setPostPage(totalPostPages);
    } else if (postPage === 0 && totalPostPages > 0) {
      setPostPage(1);
    }
  }, [selectedCategory, sortBy, totalPostPages, postPage]);


  // --- Action Handlers (Using Server Actions) ---
  const handleDeletePost = (postId: string) => {
    if (!currentUser) return;

    toast({
      title: "Confirm Delete",
      description: "Permanently remove this post?",
      variant: "destructive",
      action: (
        <ToastAction
          altText="Confirm Delete"
          className="bg-red-600 text-white hover:bg-red-700 border-none"
          onClick={async () => {
            try {
              await movePostToRecycleBin(postId, currentUser.uid);

              if (openPost?.id === postId) {
                setOpenPost(null);
              }

              await fetchPosts();

              toast({
                title: "Post Deleted",
                description: "The post was successfully deleted.",
                variant: "success",
              });
            } catch (err) {
              console.error("Failed to delete post:", err);
              toast({
                title: "Deletion Failed",
                description: "Could not delete post due to a server error.",
                variant: "destructive",
              });
            }
          }}
        >
          Delete
        </ToastAction>
      ),
    });
  };
  const canDeletePost = (post: Post) => {
    if (!currentUser) return false;
    return isAdmin || post.postedBy?.uid === currentUser.uid;
  };

  // 1. Handle Like
  const handleLike = async (postId: string) => {
    if (!currentUser) {
      // REPLACEMENT 3/10
      toast({
        title: "Login Required",
        description: "You must be logged in to like a post.",
        variant: "default",
      });
      return;
    }
    const isLiked = likedPosts[postId];

    // Optimistic UI Update (Client-side fast feedback)
    setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === postId
          ? {
            ...p,
            likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1,
          }
          : p
      )
    );
    if (openPost && openPost.id === postId) {
      setOpenPost((prev) =>
        prev
          ? {
            ...prev,
            likesCount: isLiked ? prev.likesCount - 1 : prev.likesCount + 1,
            // Ensure mandatory fields for local state updates if they might be missing in partial updates
          }
          : null
      );
    }

    try {
      // 💡 Server Action call
      await updatePostLikeStatus(
        postId,
        currentUser.uid,
        isLiked ? "dislike" : "like"
      );
    } catch (err) {
      console.error(err);
      // REPLACEMENT 4/10
      toast({
        title: "Like Failed",
        description: "Failed to update like status. Please try again.",
        variant: "destructive",
      });
      // Rollback optimistic UI on failure
      setLikedPosts((prev) => ({ ...prev, [postId]: isLiked }));
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId
            ? {
              ...p,
              likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1,
            }
            : p
        )
      );
      if (openPost && openPost.id === postId) {
        setOpenPost((prev) =>
          prev
            ? {
              ...prev,
              likesCount: isLiked ? prev.likesCount + 1 : prev.likesCount - 1,
            }
            : null
        );
      }
    }
  };

  // 2. Handle Add Comment
  const handleAddComment = async (postId: string) => {
    if (!newComment.trim() || !currentUser) return;

    // --- COOLDOWN CHECK ---
    const lastCommentTime = localStorage.getItem(`lastCommentTime_${currentUser.uid}`);
    if (lastCommentTime) {
      const timeSince = Date.now() - parseInt(lastCommentTime);
      const COOLDOWN = 60000; // 60 seconds
      if (timeSince < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - timeSince) / 1000);
        toast({
          title: "Slow Down",
          description: `Please wait ${remaining}s before commenting again.`,
          variant: "destructive",
        });
        return;
      }
    }

    const text = newComment.trim();
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      text: text,
      createdAt: new Date().toISOString(),
      commentedBy: { name: currentUser.name || "You" },
    };

    setNewComment("");

    // Optimistic UI: Add temporary comment to modal view
    if (openPost && openPost.id === postId) {
      setOpenPost((prev) =>
        prev
          ? {
            ...prev,
            comments: [...prev.comments, tempComment],
          }
          : null
      );
    }

    try {
      const payload: NewCommentData = {
        postId,
        commentedBy: currentUser.uid,
        text,
      };

      await addCommunityComment(payload);
      
      // --- SET COOLDOWN ---
      localStorage.setItem(`lastCommentTime_${currentUser.uid}`, Date.now().toString());

      // Refresh posts to get actual comment ID/timestamp and update all views
      const updatedPosts = await fetchPosts();
      updateOpenPostData(updatedPosts);

      // ADDED: Success toast for comment
      toast({
        title: "Comment Added",
        description: "Your comment has been posted.",
      });

    } catch (err: any) {
      console.error("Error adding comment:", err);
      toast({
        title: "Comment Failed",
        description: err.message || "Failed to add comment — please try again.",
        variant: "destructive",
      });
      fetchPosts(); // Fallback to full refresh
    }
  };

  // 3. Handle Create Post
  const handleCreatePost = async () => {
    if (!currentUser) {
      toast({
        title: "Login Required",
        description: "You must be logged in to create a post.",
        variant: "default",
      });
      return;
    }

    // --- COOLDOWN CHECK (Only for new posts) ---
    if (!isEditMode) {
        const lastPostTime = localStorage.getItem(`lastPostTime_${currentUser.uid}`);
        if (lastPostTime) {
          const timeSince = Date.now() - parseInt(lastPostTime);
          const COOLDOWN = 60000; // 60 seconds
          if (timeSince < COOLDOWN) {
            const remaining = Math.ceil((COOLDOWN - timeSince) / 1000);
            toast({
              title: "Slow Down",
              description: `Please wait ${remaining}s before posting again.`,
              variant: "destructive",
            });
            return;
          }
        }
    }

    if (!newTitle.trim() || !newDescription.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please enter a title and description.",
        variant: "default",
      });
      return;
    }

    setCreating(true);

    try {
        const payload: Partial<NewPostData> = {
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          image: "", 
          postedBy: currentUser.uid,
          status: "approved", 
        };

      let result;
      if (isEditMode && editingPostId) {
        result = await updateCommunityPost(editingPostId, payload, currentUser.uid);
      } else {
        (payload as NewPostData).status = "pending";
        result = await createCommunityPost(payload as NewPostData);
      }

      if (result && (result as any).success === false) {
        toast({
          title: isEditMode ? "Update Flagged" : "Post Flagged",
          description: (result as any).message,
          variant: "destructive",
        });
        return; 
      }
      
      if (!isEditMode) {
        localStorage.setItem(`lastPostTime_${currentUser.uid}`, Date.now().toString());
      }

      toast({
        title: isEditMode ? "Post Updated" : "Post Created",
        description: isEditMode ? "Your changes have been saved." : "Your post has been submitted for review.",
      });

      setCreateOpen(false);
      setIsEditMode(false);
      setEditingPostId(null);
      setNewTitle("");
      setNewDescription("");
      
      fetchPosts();
    } catch (err: any) {
      console.error("Error in post operation:", err);
      toast({
        title: "Operation Failed",
        description: err.message || "Failed to process post — please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // 4. Handle Admin Approve
  const handleApprovePost = async (postId: string) => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can approve posts.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updatePostStatus(postId, "approved");

      const updated = await fetchPosts();
      updateOpenPostData(updated);

      toast({
        title: "Post Approved",
        description: "The post is now visible to the community.",
        variant: "success",
      });
    } catch (err) {
      console.error("Error approving post:", err);
      toast({
        title: "Approval Failed",
        description: "Failed to approve post due to an error.",
        variant: "destructive",
      });
    }
  };

  // 5. Handle Admin Reject
  const handleRejectPost = async (postId: string) => {
    if (!isAdmin) {
      // REPLACEMENT 10/10
      toast({
        title: "Unauthorized",
        description: "Only admins can reject posts.",
        variant: "destructive",
      });
      return;
    }
    if (
      !confirm("Reject this post? This action can be undone by re-approving.")
    )
      return;

    try {
      await updatePostStatus(postId, "rejected");

      const updated = await fetchPosts();
      updateOpenPostData(updated);

      toast({
        title: "Post Rejected",
        description: "The post has been marked as rejected.",
        variant: "warning",
      });
    } catch (err) {
      console.error("Error rejecting post:", err);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject post due to an error.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser || !openPost) return;

    // Optimistic UI update could be complex with subcollections, so we will use the standard toast confirmation pattern
    toast({
        title: "Delete Comment?",
        description: "This action cannot be undone.",
        variant: "destructive",
        action: (
            <ToastAction
                altText="Delete"
                className="bg-red-600 text-white hover:bg-red-700 border-none"
                onClick={async () => {
                    try {
                        await deleteCommunityComment(openPost.id, commentId, currentUser.uid);
                        
                        // Update UI
                        const updatedPosts = await fetchPosts();
                        updateOpenPostData(updatedPosts);

                        toast({
                            title: "Deleted",
                            description: "Comment removed.",
                        });
                    } catch (e: any) {
                        toast({
                            title: "Error",
                            description: e.message || "Failed to delete comment.",
                            variant: "destructive"
                        });
                    }
                }}
            >
                Delete
            </ToastAction>
        )
    });
  };

  // --- UI Helpers (unchanged) ---
  const handleOpenPost = (post: Post) => {
    if (post.status === "deleted") return;

    setIsPostLoading(true);
    setTimeout(() => {
      setOpenPost(post);
      setIsPostLoading(false);
      setCommentPage(1);
      setNewComment(""); // Clear comment input
    }, 300);
  };
  const handlePostPageChange = (page: number) => {
    if (page === postPage) return;

    setLoadingPagePosts(true);
    setTimeout(() => {
      setPostPage(page);
      setLoadingPagePosts(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 300);
  };

  const handleCommentPageChange = (page: number) => {
    setLoadingPageComments(true);
    setTimeout(() => {
      setCommentPage(page);
      setLoadingPageComments(false);
    }, 300);
  };

  // --- Skeleton Component (Glassy Adapted) (unchanged) ---
  const SkeletonCard = ({ keyIndex = 0 }: { keyIndex?: number }) => (
    <div
      key={`skeleton-${keyIndex}`}
      aria-hidden
      className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-md p-6 overflow-hidden relative animate-pulse shadow-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/30" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-primary/20" />
            <div className="h-2 w-20 rounded bg-primary/10" />
          </div>
        </div>
        <div className="h-5 w-3/4 rounded bg-primary/10 mt-2" />
        <div className="h-3 w-full rounded bg-primary/10 mt-1" />
        <div className="h-3 w-5/6 rounded bg-primary/10 mt-1" />
        <div className="h-24 rounded-lg bg-primary/10 mt-3" />
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10">
          <div className="h-3 w-24 rounded bg-primary/10" />
          <div className="h-8 w-20 rounded-full bg-primary/10" />
        </div>
      </div>
    </div>
  );

  // Dynamic Tailwind classes for Glassmorphism (unchanged)
  // ... (CLASSES) ...


  return (
    <div className="w-full min-h-screen flex flex-col items-center py-16 px-4 sm:px-12 md:px-20 lg:px-28 relative overflow-hidden">
      {/* Background elements for visual depth (unchanged) */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute bottom-10 right-10 w-60 h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      {/* Content Container */}
      <div className="w-full max-w-7xl z-10">
        {/* Header */}
        <motion.div
          animate={{ y: 0, opacity: 1 }}
          className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 mb-16"
          initial={{ y: -30, opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col gap-2">
            <h1 className="text-5xl md:text-6xl lg:text-7xl text-white font-extrabold leading-tight tracking-tighter">
              Community
            </h1>
            <p className="text-white/40 text-sm font-medium ml-1">Connect, share, and grow with fellow iSITE students.</p>
          </div>

          <div className="flex flex-col gap-4 w-full sm:w-[500px] relative">
            <div 
              className={`group relative flex items-center bg-zinc-950/40 backdrop-blur-2xl border transition-all duration-500 overflow-hidden ${
                showResults 
                  ? 'rounded-t-[1.5rem] border-fuchsia-500/50 shadow-[0_0_30px_rgba(192,38,211,0.15)]' 
                  : 'rounded-full border-white/10 hover:border-white/20'
              }`}
            >
                <div className="absolute left-5 text-fuchsia-500/60 group-focus-within:text-fuchsia-400 transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                    type="text"
                    placeholder="Search by name or student ID..."
                    className="bg-transparent border-0 focus:ring-0 text-[15px] py-5 px-14 w-full text-white placeholder:text-white/20 font-medium"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    onFocus={() => setShowResults(userSearchTerm.length > 0)}
                />
                <div className="absolute right-5 flex items-center">
                  {isUserSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
                  ) : (
                    userSearchTerm && (
                      <button 
                        onClick={() => setUserSearchTerm("")}
                        className="text-white/20 hover:text-white transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-widest">Clear</span>
                      </button>
                    )
                  )}
                </div>
            </div>

            <AnimatePresence>
                {showResults && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        className="absolute top-full left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-[40px] border border-t-0 border-white/10 rounded-b-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          {userSearchResults.length > 0 ? (
                              <div className="flex flex-col p-3 gap-1">
                                  <div className="px-4 py-2">
                                    <span className="text-[10px] font-black text-fuchsia-500/50 uppercase tracking-[0.2em]">People / IDs</span>
                                  </div>
                                  {userSearchResults.map((user) => (
                                      <Link 
                                          key={user.uid}
                                          href={`/profile/${user.uid}`}
                                          className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group"
                                          onClick={() => setShowResults(false)}
                                      >
                                          <div className="flex items-center gap-4">
                                            <Avatar className="w-11 h-11 border-2 border-white/5 group-hover:border-fuchsia-500/50 transition-all shadow-xl">
                                                <AvatarImage src={user.photoURL} className="object-cover" />
                                                <AvatarFallback className="bg-zinc-800 text-fuchsia-400 text-sm font-black">
                                                    {user.name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[15px] font-bold text-white group-hover:text-fuchsia-300 transition-colors truncate">
                                                    {user.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">
                                                      {user.role}
                                                  </span>
                                                  {user.studentId && (
                                                    <>
                                                      <span className="w-1 h-1 rounded-full bg-white/10" />
                                                      <span className="text-[10px] text-fuchsia-500/40 font-bold tracking-wider">
                                                        #{user.studentId}
                                                      </span>
                                                    </>
                                                  )}
                                                </div>
                                            </div>
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform duration-300">
                                            <ChevronDown className="w-4 h-4 text-fuchsia-500 -rotate-90" />
                                          </div>
                                      </Link>
                                  ))}
                              </div>
                          ) : (
                              !isUserSearching && (
                                  <div className="p-12 text-center flex flex-col items-center gap-3">
                                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                        <Search className="w-6 h-6 text-white/10" />
                                      </div>
                                      <p className="text-white/20 text-sm font-bold uppercase tracking-widest">No matching results</p>
                                  </div>
                              )
                          )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {/* Create Post Button */}
            <Button
              variant="default"
              className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-fuchsia-900/20 transition-all hover:scale-105 active:scale-95 border-0"
              onClick={() => {
                if (!currentUser) {
                  // REPLACEMENT (Toast triggered here too)
                  toast({
                    title: "Login Required",
                    description: "You need to login to create a post.",
                    variant: "default",
                  });
                  return;
                }
                setCreateOpen(true);
              }}
            >
              + Create Post
            </Button>

            {/* Category Dropdown (Glassy) (unchanged) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={GLASSY_BUTTON_OUTLINE}>
                  Category:{" "}
                  <span className="ml-2 font-bold">{selectedCategory}</span>
                  <ChevronDown className="h-4 w-4 opacity-70 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl border border-white/20 bg-white/20 backdrop-blur-md text-white shadow-lg">
                {categories.map((cat) => (
                  <DropdownMenuItem
                    key={cat}
                    onSelect={() => {
                      setSelectedCategory(cat);
                      handlePostPageChange(1);
                    }}
                    className={`cursor-pointer transition-colors hover:bg-white/20 rounded-lg ${selectedCategory === cat
                      ? "font-bold bg-white/10 text-primary-400"
                      : ""
                      }`}
                  >
                    {cat}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Button (Glassy) (unchanged) */}
            <Button
              variant="outline"
              className={GLASSY_BUTTON_OUTLINE}
              onClick={() => {
                setSortBy((s) => (s === "Top" ? "New" : "Top"));
                handlePostPageChange(1);
              }}
            >
              {sortBy === "Top" ? (
                <BarChart2 className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Sort: <span className="ml-2 font-bold">{sortBy}</span>
            </Button>
          </div>
        </motion.div>

        <Separator className="mb-12 w-full max-w-7xl mx-auto bg-white/20" />

        {/* Posts Grid (Revamped) */}
        {isLoading || loadingPagePosts ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 mx-auto px-6 py-12"
            initial={{ opacity: 0 }}
          >
            {/* Render 8 skeletons */}
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard keyIndex={i} />
            ))}
          </motion.div>
        ) : (
          <>
            <motion.section
              layout
              className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 mx-auto px-6 py-12 items-stretch"
            >
              <AnimatePresence>
                {paginatedPosts.length === 0 ? (
                  <div className="col-span-full text-center text-xl text-white/50 py-32 w-full">
                    No posts found in this category or sorting view.
                  </div>
                ) : (
                  paginatedPosts.map((c) => (
                    <motion.div
                      key={c.id}
                      className={`cursor-pointer ${GLASSY_CARD_CLASSES} w-full h-full flex flex-col`}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      whileHover={{ y: -6, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpenPost(c)}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <div className="flex flex-col h-full justify-between gap-6">
                        <div>
                          {/* Post Header */}
                          <div className="flex flex-col gap-4 border-b border-white/5 pb-5 mb-5 relative">
                            {c.status === "pending" && (
                              <div className="flex items-center">
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black uppercase tracking-[0.1em]">
                                  Pending Review
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-3 w-full">
                              {c.postedBy?.uid ? (
                                <Link 
                                  href={`/profile/${c.postedBy.uid}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-3 group/author flex-1 min-w-0"
                                >
                                  {c.postedBy.photoURL ? (
                                      <Avatar className="w-10 h-10 border-2 border-white/10 group-hover/author:border-fuchsia-500/50 transition-all shadow-lg">
                                          <AvatarImage src={c.postedBy.photoURL} className="object-cover" />
                                          <AvatarFallback className="bg-zinc-800 text-fuchsia-400 font-bold">
                                            {c.postedBy.name?.[0]}
                                          </AvatarFallback>
                                      </Avatar>
                                  ) : (
                                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-white/5 transition-all">
                                        <UserCircle className="w-6 h-6 text-white/40 group-hover/author:text-fuchsia-400" />
                                      </div>
                                  )}
                                  <div className="flex flex-col min-w-0">
                                    <h3 className="text-sm font-bold text-white leading-tight truncate group-hover/author:text-fuchsia-300 transition-colors">
                                      {c.postedBy?.name || "Anonymous"}
                                    </h3>
                                    <span className="text-[10px] text-white/30 mt-1 font-medium italic">
                                      {formatDate(c.createdAt)}
                                    </span>
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-white/5">
                                    <UserCircle className="w-6 h-6 text-white/40" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <h3 className="text-sm font-bold text-white leading-tight">
                                      {c.postedBy?.name || "Anonymous"}
                                    </h3>
                                    <span className="text-[10px] text-white/30 mt-1 font-medium italic">
                                      {formatDate(c.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {canDeletePost(c) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-white/30 hover:text-white hover:bg-white/5 rounded-full"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>

                                  <DropdownMenuContent
                                    align="end"
                                    className="rounded-xl bg-zinc-900 border border-white/10 text-white p-1"
                                  >
                                    <DropdownMenuItem
                                      className="text-white/70 focus:text-white cursor-pointer rounded-lg px-3 py-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditMode(true);
                                        setEditingPostId(c.id);
                                        setNewTitle(c.title);
                                        setNewDescription(c.description);
                                        setNewCategory(c.category);
                                        setCreateOpen(true);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      <span className="font-semibold text-xs">Edit Post</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      className="text-red-400 focus:text-red-300 cursor-pointer rounded-lg px-3 py-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePost(c.id);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      <span className="font-semibold text-xs">Delete Post</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>


                          {/* Post Content */}
                          <div className="min-h-[110px] flex flex-col pt-1">
                            <h4 className="text-xl font-bold leading-tight text-white group-hover:text-fuchsia-300 transition-colors line-clamp-2 tracking-tight">
                              {c.title}
                            </h4>
                            <p className="text-sm text-white/40 mt-4 line-clamp-3 leading-relaxed font-normal">
                              {c.description}
                            </p>
                          </div>
                        </div>

                        {/* Post Footer */}
                        <div className="mt-auto pt-6 border-t border-white/5">
                          <div className="flex flex-wrap items-center justify-between gap-y-4">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="text-[9px] px-2 py-0.5 bg-white/5 text-white/50 rounded-md border border-white/5 font-bold uppercase tracking-[0.1em]">
                                {c.category}
                              </span>
                              
                              <div className="flex items-center gap-3 text-white/30">
                                <div className="flex items-center gap-1.5 transition-colors hover:text-rose-400">
                                  <Heart className="w-3.5 h-3.5" />
                                  <span className="text-xs font-bold">{c.likesCount}</span>
                                </div>
                                <div className="flex items-center gap-1.5 transition-colors hover:text-fuchsia-400">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span className="text-xs font-bold">{c.comments.length}</span>
                                </div>
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              className="w-full sm:w-auto rounded-xl bg-white/5 hover:bg-fuchsia-600 text-white border border-white/10 hover:border-transparent transition-all font-bold text-xs px-5 py-5 shadow-lg active:scale-95 ml-auto"
                            >
                              View Post
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </motion.section>

            {/* Posts Pagination (Glassy) */}
            {totalPostPages > 1 && (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-7xl flex justify-center mt-12"
                initial={{ opacity: 0, y: 10 }}
              >
                <div className="rounded-xl border border-white/30 bg-white/10 p-2 shadow-inner backdrop-blur-md">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePostPageChange(Math.max(1, postPage - 1));
                          }}
                          className={postPage === 1 ? "pointer-events-none opacity-50 text-gray-400" : "text-white hover:bg-white/10 hover:text-white"}
                        />
                      </PaginationItem>
                      {/* Use getPageWindow helper/logic if total pages is large, otherwise map all */}
                      {(totalPostPages <= 5
                        ? Array.from({ length: totalPostPages }, (_, i) => i + 1)
                        : getPageWindow(postPage, totalPostPages, 5)
                      ).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePostPageChange(page);
                            }}
                            isActive={page === postPage}
                            className={page === postPage
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                              : "text-white hover:bg-white/10 hover:text-white rounded-full"
                            }
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePostPageChange(Math.min(totalPostPages, postPage + 1));
                          }}
                          className={postPage === totalPostPages ? "pointer-events-none opacity-50 text-gray-400" : "text-white hover:bg-white/10 hover:text-white"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ---------------- VIEW POST MODAL (Glassy Dialog) (unchanged) ---------------- */}
        <Dialog
          open={!!openPost || isPostLoading}
          onOpenChange={(open) => {
            if (!open) {
              setOpenPost(null);
              setNewComment(""); // Clear comment when closing
            } else {
               // In case it's opened via other means not going through handleOpenPost (unlikely but safe)
               setOpenPost(null);
            }
          }}
        >
          <DialogContent className={GLASSY_MODAL_CLASSES}>
            {isPostLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/10 backdrop-blur-sm z-50 rounded-xl">
                <div className="flex flex-col items-center text-white">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                  <p className="text-sm text-white/70">Opening post...</p>
                </div>
              </div>
            )}

            {openPost && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={openPost.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <DialogHeader className="flex flex-row justify-between items-center space-y-0 pb-4 border-b border-white/20 mb-6">
                    <div className="flex items-center gap-3">
                      {openPost.postedBy?.uid ? (
                        <Link 
                          href={`/profile/${openPost.postedBy.uid}`}
                          className="flex items-center gap-3 group/author"
                        >
                          {openPost.postedBy.photoURL ? (
                              <Avatar className="w-10 h-10 border-2 border-transparent group-hover/author:border-white/50 transition-colors">
                                  <AvatarImage src={openPost.postedBy.photoURL} />
                                  <AvatarFallback className="bg-primary/20 text-primary-200">
                                    {openPost.postedBy.name?.[0]}
                                  </AvatarFallback>
                              </Avatar>
                          ) : (
                              <UserCircle className="w-10 h-10 text-primary-400 group-hover/author:text-white transition-colors" />
                          )}
                          <div>
                            <DialogTitle className="font-extrabold text-xl group-hover/author:underline decoration-primary-400 underline-offset-2">
                              {openPost.postedBy?.name || "Anonymous"}
                            </DialogTitle>
                            <span className="text-xs text-white/70">
                              {formatDate(openPost.createdAt)} | {openPost.category}
                            </span>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3">
                          <UserCircle className="w-10 h-10 text-primary-400" />
                          <div>
                            <DialogTitle className="font-extrabold text-xl">
                              {openPost.postedBy?.name || "Anonymous"}
                            </DialogTitle>
                            <span className="text-xs text-white/70">
                              {formatDate(openPost.createdAt)} | {openPost.category}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 items-center">
                      {openPost.status === "pending" && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-500 text-black font-semibold">
                          Pending
                        </span>
                      )}

                      {/* Admin controls (Logic updated with toasts) */}
                      {isAdmin && openPost.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="rounded-full bg-green-500 text-black"
                            onClick={() => handleApprovePost(openPost.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full bg-red-600 text-white"
                            onClick={() => handleRejectPost(openPost.id)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </DialogHeader>

                  <div className="mb-8">
                    <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight text-primary-300">
                      {openPost.title}
                    </h2>
                    <p className="text-base text-white/90 leading-relaxed">
                      {openPost.description}
                    </p>
                  </div>

                  <div className="flex gap-10 mb-8 border-y border-white/10 py-4">
                    <Button
                      variant="ghost"
                      className={`flex items-center gap-2 transition hover:bg-white/10 p-0 ${likedPosts[openPost.id]
                        ? "text-red-500 hover:text-red-400"
                        : "text-white/80 hover:text-white"
                        }`}
                      onClick={() => handleLike(openPost.id)}
                    >
                      <Heart
                        className={`w-6 h-6 transition-all ${likedPosts[openPost.id]
                          ? "fill-red-500 scale-110"
                          : "fill-white/10"
                          }`}
                      />
                      <span className="text-lg font-semibold">
                        {openPost.likesCount} Likes
                      </span>
                    </Button>

                    <div className="flex items-center gap-2 text-primary-400">
                      <MessageCircle className="w-6 h-6" />
                      <span className="text-lg font-semibold">
                        {openPost.comments.length} Comments
                      </span>
                    </div>
                  </div>

                  <Separator className={GLASSY_SEPARATOR} />

                  <div className="pt-6">
                    <h4 className="text-xl font-extrabold mb-5 text-white">
                      Comments ({openPost.comments.length})
                    </h4>

                    {loadingPageComments ? (
                      <div className="flex flex-col gap-3">
                        {Array.from({ length: commentsPerPage }).map((_, i) => (
                          <div
                            key={i}
                            className="h-16 rounded-lg bg-white/10 animate-pulse w-full border border-white/10"
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        {openPost.comments.length === 0 && (
                          <p className="text-white/70 text-base italic">
                            Be the first to comment!
                          </p>
                        )}

                        <div className="space-y-4">
                          {[...openPost.comments]
                            .reverse()
                            .slice(
                              (commentPage - 1) * commentsPerPage,
                              commentPage * commentsPerPage
                            )
                            .map((c) => (
                              <div
                                key={c.id}
                                className={`flex flex-col gap-1 rounded-xl p-4 transition-shadow shadow-md ${GLASSY_COMMENT_BG}`}
                              >
                                <div className="flex items-center gap-2">
                                  {c.commentedBy?.uid ? (
                                      <Link href={`/profile/${c.commentedBy.uid}`} className="flex items-center gap-2 group/commenter">
                                          {c.commentedBy.photoURL ? (
                                              <Avatar className="w-6 h-6 border border-white/10 group-hover/commenter:border-white/50 transition-colors">
                                                  <AvatarImage src={c.commentedBy.photoURL} />
                                                  <AvatarFallback className="text-[10px]">{c.commentedBy.name?.[0]}</AvatarFallback>
                                              </Avatar>
                                          ) : (
                                              <UserCircle className="w-6 h-6 text-white/70 group-hover/commenter:text-white transition-colors" />
                                          )}
                                          <span className="text-sm font-bold text-primary-200 group-hover/commenter:underline underline-offset-2 decoration-primary-400">
                                              {c.commentedBy?.name || "Anonymous"}
                                          </span>
                                      </Link>
                                  ) : (
                                      <>
                                          <UserCircle className="w-5 h-5 text-white/70" />
                                          <span className="text-sm font-bold text-primary-200">
                                              {c.commentedBy?.name || "Anonymous"}
                                          </span>
                                      </>
                                  )}
                                  <span className="text-xs text-white/50 ml-auto">
                                    {formatDate(c.createdAt)}
                                  </span>
                                  {/* Delete Button for Comment Owner or Admin */}
                                  {(currentUser?.uid === (c.commentedBy as any)?.uid || currentUser?.uid === c.commentedBy?.id || isAdmin) && (
                                      <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-white/30 hover:text-red-400 hover:bg-transparent ml-2"
                                          onClick={() => handleDeleteComment(c.id)}
                                      >
                                          <Trash2 className="h-3 w-3" />
                                      </Button>
                                  )}
                                </div>
                                <p className="text-sm text-white/90 pl-7 mt-1">
                                  {c.text}
                                </p>
                              </div>
                            ))}
                        </div>
                        {Math.ceil(openPost.comments.length / commentsPerPage) >
                          1 && (
                            <div className="flex justify-center mt-6 gap-1">
                              {getPageWindow(
                                commentPage,
                                Math.ceil(
                                  openPost.comments.length / commentsPerPage
                                ),
                                5
                              ).map((p) => (
                                <Button
                                  key={p}
                                  size="sm"
                                  variant={
                                    commentPage === p ? "default" : "ghost"
                                  }
                                  onClick={() => handleCommentPageChange(p)}
                                  className={`rounded-full h-8 w-8 text-sm ${commentPage === p
                                    ? "bg-primary hover:bg-primary/90"
                                    : GLASSY_BUTTON_GHOST
                                    }`}
                                >
                                  {p}
                                </Button>
                              ))}
                            </div>
                          )}
                      </>
                    )}

                    {/* Add comment input (Glassy) */}
                    <div className="mt-8 flex gap-3">
                      <Input
                        className={GLASSY_INPUT_CLASSES}
                        placeholder={
                          currentUser
                            ? "Share your thoughts..."
                            : "Login to comment"
                        }
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={!currentUser}
                      />
                      <Button
                        className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-fuchsia-900/20 disabled:opacity-50 disabled:shadow-none border-0"
                        onClick={() => handleAddComment(openPost.id)}
                        disabled={!currentUser || !newComment.trim()}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </DialogContent>
        </Dialog>

        {/* ---------------- CREATE POST MODAL ---------------- */}
        <Dialog 
          open={createOpen} 
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              setNewTitle("");
              setNewDescription("");
              setNewCategory(categories[1] || "Tech");
              setIsEditMode(false);
              setEditingPostId(null);
            }
          }}
        >
          <DialogContent className={GLASSY_MODAL_CLASSES}>
            <DialogHeader className="p-8 pb-0">
            <DialogTitle className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 tracking-tight">
              {isEditMode ? "Edit Post" : "Create Post"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-8 pt-6 space-y-6">
              <div className="space-y-1">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title"
                  maxLength={70}
                  className={`w-full ${GLASSY_INPUT_CLASSES.replace('flex-1', '')}`}
                />
                <div className="text-right text-xs text-gray-400 px-1">
                  {newTitle.length}/70
                </div>
              </div>
              
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description"
                className={GLASSY_TEXTAREA_CLASSES}
              />
              <div className="flex gap-2 items-center">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="rounded-full px-4 py-2 bg-white/10 border border-white/30 text-white focus:ring-primary focus:border-primary transition-colors"
                >
                  {categories
                    .filter((c) => c !== "All")
                    .map((cat) => (
                      <option
                        key={cat}
                        value={cat}
                        className="bg-black text-white"
                      >
                        {cat}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="ghost"
                  className="rounded-full text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-fuchsia-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] border-0"
                  onClick={handleCreatePost}
                  disabled={creating}
                >
                  {creating ? (isEditMode ? "Updating..." : "Posting...") : (isEditMode ? "Save Changes" : "Post Content")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
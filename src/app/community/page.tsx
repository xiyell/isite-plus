"use client";

import { useState, useEffect } from "react";
// Shadcn Components
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
// Icons
import {
    ChevronDown,
    X,
    Heart,
    MessageCircle,
    Loader2,
    Clock,
    UserCircle,
    BarChart2,
} from "lucide-react";

// Firebase/Data Imports (Assume setup is correct)
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    getDocs,
    query,
    orderBy,
    getDoc,
} from "firebase/firestore";
import { auth, db } from "@/services/firebase";

// --- Interfaces and Data (Retained) ---
const categories = ["All", "Tech", "Gaming", "Art", "Science"];

// Add your admin UIDs here (replace with actual Firebase UIDs of admins)
const ADMIN_UIDS: string[] = [
    // "adminUid1",
    // "adminUid2",
];

interface User {
    name?: string;
}

interface Comment {
    id: string;
    text: string;
    createdAt?: string | null;
    commentedBy?: User | null;
}

type PostStatus = "pending" | "approved" | "rejected";

interface Post {
    id: string;
    title: string;
    description: string;
    category: string;
    likesCount: number;
    dislikesCount: number;
    createdAt?: string | null;
    postedBy?: User | null;
    comments: Comment[];
    image?: string;
    status?: PostStatus;
    createdAtISO?: string | null;
}

// --- Utility Functions (Retained) ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDate(date: any) {
    if (!date) return "Unknown date";
    try {
        if (typeof date === 'object' && '_seconds' in date && typeof date._seconds === 'number') {
            return new Date(date._seconds * 1000).toLocaleString();
        }
        if (typeof date === 'object' && 'seconds' in date && typeof date.seconds === 'number') {
            return new Date(date.seconds * 1000).toLocaleString();
        }
        return new Date(date).toLocaleString();
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

// --- Main Component ---

export default function CommunityPage() {
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
    } | null>(null);

    // New states for creating a post
    const [createOpen, setCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newCategory, setNewCategory] = useState(categories[1] || "Tech");
    const [newImageUrl, setNewImageUrl] = useState("");
    const [creating, setCreating] = useState(false);

    // 🚀 UPDATED: Set posts per page to 10
    const postsPerPage = 10;
    const commentsPerPage = 5;

    // --- Data Fetching (Retained Logic) ---
    const fetchPosts = async (): Promise<Post[]> => {
        setIsLoading(true);
        try {
            const postsRef = collection(db, "community");
            const q = query(postsRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            const data: Post[] = await Promise.all(
                snapshot.docs.map(async (docSnap) => {
                    const post = docSnap.data();

                    let createdAtISO: string | null = null;
                    if (post.createdAt?.seconds) {
                        createdAtISO = new Date(
                            post.createdAt.seconds * 1000,
                        ).toISOString();
                    } else if (post.createdAt) {
                        // fallback if string was used
                        createdAtISO = new Date(post.createdAt).toISOString();
                    }

                    let postedByUser: User | null = null;
                    if (post.postedBy) {
                        try {
                            const userSnap = await getDoc(post.postedBy);
                            if (userSnap.exists()) {
                                postedByUser = userSnap.data() as User;
                            }
                        } catch (e) {
                            console.error("Error fetching postedBy user:", e);
                        }
                    }

                    const commentsCol = collection(
                        db,
                        "community",
                        docSnap.id,
                        "comments",
                    );
                    const commentsSnap = await getDocs(
                        query(commentsCol, orderBy("createdAt", "asc")),
                    );

                    const comments: Comment[] = await Promise.all(
                        commentsSnap.docs.map(async (cSnap) => {
                            const cData = cSnap.data();

                            let createdAtISO: string | null = null;
                            if (cData.createdAt?.seconds) {
                                createdAtISO = new Date(
                                    cData.createdAt.seconds * 1000,
                                ).toISOString();
                            } else if (cData.createdAt) {
                                createdAtISO = new Date(cData.createdAt).toISOString();
                            }

                            let commentedByUser: User | null = null;
                            if (cData.commentedBy) {
                                try {
                                    const userSnap = await getDoc(cData.commentedBy);
                                    if (userSnap.exists()) {
                                        commentedByUser = userSnap.data() as User;
                                    }
                                } catch (e) {
                                    console.error("Error fetching commentedBy user:", e);
                                }
                            }

                            return {
                                id: cSnap.id,
                                text: cData.text,
                                createdAt: createdAtISO,
                                commentedBy: commentedByUser || { name: "Anonymous" },
                            } as Comment;
                        }),
                    );

                    return {
                        id: docSnap.id,
                        title: post.title,
                        description: post.description,
                        category: post.category,
                        likesCount: post.likesCount || 0,
                        dislikesCount: post.dislikesCount || 0,
                        createdAt: createdAtISO,
                        postedBy: postedByUser || { name: "Anonymous" },
                        comments: comments,
                        image: post.image || "",
                        status: post.status || "approved", // default to approved if not set
                        createdAtISO,
                    } as Post;
                }),
            );

            setPosts(data);
            return data;
        } catch (err) {
            console.error("Error fetching posts:", err);
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    const updateOpenPostData = (updatedPosts: Post[]) => {
        if (openPost) {
            const updatedPost = updatedPosts.find(p => p.id === openPost.id);
            if (updatedPost) {
                setOpenPost(updatedPost);
            }
        }
    };


    useEffect(() => {
        fetchPosts();
    }, []);

    // --- Auth State Listener (Retained) ---
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser({
                    uid: user.uid,
                    name: user.displayName || "Anonymous",
                });
            } else {
                setCurrentUser(null);
            }
        });
        return () => unsub();
    }, []);

    // Determine admin status
    const isAdmin = currentUser ? ADMIN_UIDS.includes(currentUser.uid) : false;

    // --- Filtering & Sorting (Retained logic) ---
    const filtered = posts
        .filter((c) => {
            // Only show approved posts to regular users
            if (!isAdmin) {
                return (selectedCategory === "All" || c.category === selectedCategory) && c.status === "approved";
            }
            // Admins see everything, but can filter by category still
            return (selectedCategory === "All" || c.category === selectedCategory);
        })
        .sort((a, b) => {
            if (sortBy === "Top") return (b.likesCount || 0) - (a.likesCount || 0);
            if (sortBy === "New") {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            }
            return 0;
        });


    // --- Pagination Logic (Retained) ---
    const totalPostPages = Math.max(1, Math.ceil(filtered.length / postsPerPage));
    const startPostIndex = (postPage - 1) * postsPerPage;
    const paginatedPosts = filtered.slice(
        startPostIndex,
        startPostIndex + postsPerPage,
    );

    // --- Handlers (Retained Logic) ---
    const handleLike = async (postId: string) => {
        if (!currentUser) {
            console.log("User must be logged in to like a post.");
            return;
        }

        const isLiked = likedPosts[postId];

        // Optimistic UI update
        setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));

        // Update posts state optimistically (for immediate count change on post card)
        setPosts(prevPosts =>
            prevPosts.map(p =>
                p.id === postId ? {
                    ...p,
                    likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1
                } : p
            )
        );

        // Update openPost state if it's the current one
        if (openPost && openPost.id === postId) {
            setOpenPost(prev => prev ? ({
                ...prev,
                likesCount: isLiked ? prev.likesCount - 1 : prev.likesCount + 1
            }) : null);
        }


        try {
            await fetch("/api/community", {
                method: "PATCH",
                body: JSON.stringify({
                    postId,
                    userId: currentUser.uid,
                    type: isLiked ? "dislike" : "like",
                }),
                headers: { "Content-Type": "application/json" },
            });
        } catch (err) {
            console.error(err);
            // Rollback UI update on failure
            setLikedPosts((prev) => ({ ...prev, [postId]: isLiked }));
            setPosts(prevPosts =>
                prevPosts.map(p =>
                    p.id === postId ? {
                        ...p,
                        likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1
                    } : p
                )
            );
            if (openPost && openPost.id === postId) {
                setOpenPost(prev => prev ? ({
                    ...prev,
                    likesCount: isLiked ? prev.likesCount + 1 : prev.likesCount - 1
                }) : null);
            }
        }
    };


    const handleAddComment = async (postId: string) => {
        if (!newComment.trim() || !currentUser) return;

        try {
            const newCommentData = {
                postId,
                commentedBy: currentUser.uid,
                text: newComment.trim(),
                createdAt: new Date().toISOString(),
            };

            setNewComment("");

            // Temporary, optimistic comment addition
            const tempComment: Comment = {
                id: `temp-${Date.now()}`,
                text: newCommentData.text,
                createdAt: new Date().toISOString(),
                commentedBy: { name: currentUser.name || "You" },
            };

            if (openPost && openPost.id === postId) {
                setOpenPost(prev => prev ? ({
                    ...prev,
                    comments: [...prev.comments, tempComment]
                }) : null);
            }

            await fetch(`/api/community/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCommentData),
            });

            const updatedPosts = await fetchPosts();
            updateOpenPostData(updatedPosts);

        } catch (err) {
            console.error("Error adding comment:", err);
            fetchPosts();
        }
    };

    const handleOpenPost = (post: Post) => {
        setIsPostLoading(true);
        // Reduced delay for better UX
        setTimeout(() => {
            setOpenPost(post);
            setIsPostLoading(false);
            setCommentPage(1);
        }, 300);
    };

    const handlePostPageChange = (page: number) => {
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

    // --- Create Post Handler ---
    const handleCreatePost = async () => {
        if (!currentUser) {
            alert("You must be logged in to create a post.");
            return;
        }
        if (!newTitle.trim() || !newDescription.trim()) {
            alert("Please enter title and description.");
            return;
        }

        setCreating(true);

        // Prepare payload
        const payload = {
            title: newTitle.trim(),
            description: newDescription.trim(),
            category: newCategory,
            image: newImageUrl || "",
            postedBy: currentUser.uid,
            createdAt: new Date().toISOString(),
            status: "pending", // New posts are pending approval
        };

        try {
            // Create post via API (adjust endpoint to your server)
            await fetch("/api/community", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            // optimistic UI: close modal and reset -> show message that it's pending
            setCreateOpen(false);
            setNewTitle("");
            setNewDescription("");
            setNewCategory(categories[1] || "Tech");
            setNewImageUrl("");

            // refresh posts so admins will see the new pending post
            await fetchPosts();

            alert("Post submitted for review. An admin will approve it shortly.");
        } catch (err) {
            console.error("Error creating post:", err);
            alert("Failed to create post — try again.");
        } finally {
            setCreating(false);
        }
    };

    // --- Admin Approve Handler ---
    const handleApprovePost = async (postId: string) => {
        if (!isAdmin) {
            alert("Only admins can approve posts.");
            return;
        }

        try {
            // Send approve action to API — adapt server route if different
            await fetch("/api/community", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "approve", postId }),
            });

            // Refresh posts
            const updated = await fetchPosts();
            // If modal open for that post, update it
            updateOpenPostData(updated);
        } catch (err) {
            console.error("Error approving post:", err);
            alert("Failed to approve post.");
        }
    };

    // --- Reject Handler (optional) ---
    const handleRejectPost = async (postId: string) => {
        if (!isAdmin) {
            alert("Only admins can reject posts.");
            return;
        }
        if (!confirm("Reject this post? This action can be undone by re-approving.")) return;

        try {
            await fetch("/api/community", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reject", postId }),
            });

            const updated = await fetchPosts();
            updateOpenPostData(updated);
        } catch (err) {
            console.error("Error rejecting post:", err);
            alert("Failed to reject post.");
        }
    };

    // --- Skeleton Component (Glassy Adapted) ---
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

    // Dynamic Tailwind classes for Glassmorphism
    const GLASSY_CARD_CLASSES = "rounded-xl border border-white/20 bg-white/5 backdrop-blur-md text-white p-6 overflow-hidden transition-all hover:border-primary/50 shadow-2xl";
    // 💡 Increased padding in modal for better spacing
    const GLASSY_MODAL_CLASSES = "max-w-xl p-8 sm:p-10 overflow-y-auto max-h-[90vh] rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl text-white shadow-2xl";
    const GLASSY_BUTTON_OUTLINE = "gap-2 rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20 transition-colors";
    const GLASSY_BUTTON_GHOST = "text-white/80 hover:bg-white/10 hover:text-white rounded-full";
    const GLASSY_INPUT_CLASSES = "flex-1 rounded-full px-4 py-2 border-white/30 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-primary focus-visible:ring-offset-white/10";
    const GLASSY_COMMENT_BG = "bg-white/5 border border-white/10";
    const GLASSY_SEPARATOR = "bg-white/20";


    return (
        <div className="w-full min-h-screen flex flex-col items-center py-16 px-4 sm:px-12 md:px-20 lg:px-28 relative overflow-hidden">
            {/* Background elements for visual depth (Optional, but enhances glassmorphism) */}
            <div className="absolute top-0 left-0 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute bottom-10 right-10 w-60 h-60 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

            {/* Content Container */}
            <div className="w-full max-w-7xl z-10">
                {/* Header */}
                <motion.div
                    animate={{ y: 0, opacity: 1 }}
                    // 💡 Increased margin bottom for better separation
                    className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 mb-16"
                    initial={{ y: -30, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-5xl md:text-6xl lg:text-7xl text-white font-extrabold leading-tight tracking-tighter">
                        Community
                    </h1>

                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Create Post Button */}
                        <Button
                            variant="default"
                            className="rounded-full bg-accent text-black font-semibold"
                            onClick={() => {
                                if (!currentUser) {
                                    alert("You need to login to create a post.");
                                    return;
                                }
                                setCreateOpen(true);
                            }}
                        >
                            + Create Post
                        </Button>

                        {/* Category Dropdown (Glassy) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className={GLASSY_BUTTON_OUTLINE}>
                                    Category: <span className="ml-2 font-bold">{selectedCategory}</span>
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
                                        className={`cursor-pointer transition-colors hover:bg-white/20 rounded-lg ${selectedCategory === cat ? "font-bold bg-white/10 text-primary-400" : ""}`}
                                    >
                                        {cat}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Sort Button (Glassy) */}
                        <Button
                            variant="outline"
                            className={GLASSY_BUTTON_OUTLINE}
                            onClick={() => {
                                setSortBy((s) => (s === "Top" ? "New" : "Top"));
                                handlePostPageChange(1);
                            }}
                        >
                            {sortBy === "Top" ? <BarChart2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            Sort: <span className="ml-2 font-bold">{sortBy}</span>
                        </Button>
                    </div>
                </motion.div>

                <Separator className="mb-12 w-full max-w-7xl mx-auto bg-white/20" />


                {/* Posts */}
                {isLoading || loadingPagePosts ? (
                    <motion.div
                        animate={{ opacity: 1 }}
                        // 💡 Adjusted grid layout for 10 items per page (4 columns max)
                        className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 items-start"
                        initial={{ opacity: 0 }}
                    >
                        {/* Render 10 skeletons */}
                        {Array.from({ length: 10 }).map((_, i) => (
                            <SkeletonCard keyIndex={i} key={i} />
                        ))}
                    </motion.div>
                ) : (
                    <>
                        <motion.section
                            layout
                            // 💡 Increased gap for better spacing between cards
                            className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 items-stretch"
                        >
                            <AnimatePresence>
                                {paginatedPosts.map((c) => (
                                    <motion.div
                                        key={c.id}
                                        className={`cursor-pointer ${GLASSY_CARD_CLASSES}`}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleOpenPost(c)}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <div className="flex flex-col h-full justify-between gap-6"> {/* Increased gap */}
                                            <div>
                                                {/* Post Header */}
                                                <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4"> {/* Increased padding */}
                                                    <UserCircle className="w-8 h-8 text-primary/80 flex-shrink-0" />
                                                    <div className="flex flex-col">
                                                        <h3 className="text-sm font-bold text-white leading-none">
                                                            {c.postedBy?.name || "Anonymous"}
                                                        </h3>
                                                        <span className="text-xs text-white/60">
                                                            Posted on {formatDate(c.createdAt)}
                                                        </span>
                                                    </div>
                                                    {/* show pending badge if pending */}
                                                    {c.status === "pending" && (
                                                        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-yellow-500 text-black font-semibold">
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Post Content */}
                                                <h4 className="text-2xl font-extrabold mt-3 leading-snug text-primary-200">
                                                    {c.title}
                                                </h4>
                                                <p className="text-sm text-white/80 mt-3 line-clamp-3"> {/* Increased margin top */}
                                                    {c.description}
                                                </p>
                                            </div>

                                            {/* Post Footer */}
                                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                                <div className="text-xs text-white/60 space-x-3"> {/* Increased space-x */}
                                                    <span className="capitalize px-2 py-0.5 bg-primary/20 rounded-full text-primary-300 font-medium">
                                                        {c.category}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <Heart className="w-3 h-3" />
                                                        {c.likesCount}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <MessageCircle className="w-3 h-3" />
                                                        {c.comments.length}
                                                    </span>
                                                </div>
                                                <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-white font-semibold">
                                                    View Post
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.section>

                        {/* Posts Pagination (Glassy) */}
                        {totalPostPages > 1 && (
                            <motion.div
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full max-w-7xl flex justify-center mt-12"
                                initial={{ opacity: 0, y: 10 }}
                            >
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 p-2 shadow-inner">
                                    <Button
                                        aria-label="Previous page"
                                        variant="ghost"
                                        size="sm"
                                        className={GLASSY_BUTTON_GHOST}
                                        disabled={postPage === 1}
                                        onClick={() =>
                                            handlePostPageChange(Math.max(1, postPage - 1))
                                        }
                                    >
                                        Prev
                                    </Button>
                                    {getPageWindow(postPage, totalPostPages, 5).map((p) => (
                                        <Button
                                            key={p}
                                            size="sm"
                                            className={`rounded-full h-8 w-8 text-sm transition-all ${postPage === p
                                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                : GLASSY_BUTTON_GHOST
                                                }`}
                                            onClick={() => handlePostPageChange(p)}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                    <Button
                                        aria-label="Next page"
                                        variant="ghost"
                                        size="sm"
                                        className={GLASSY_BUTTON_GHOST}
                                        disabled={postPage === totalPostPages}
                                        onClick={() =>
                                            handlePostPageChange(Math.min(totalPostPages, postPage + 1))
                                        }
                                    >
                                        Next
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}

                {/* ---------------- VIEW POST MODAL (Glassy Dialog) ---------------- */}
                <Dialog open={!!openPost || isPostLoading} onOpenChange={() => setOpenPost(null)}>
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
                                    {/* Post Header */}
                                    <DialogHeader className="flex flex-row justify-between items-center space-y-0 pb-4 border-b border-white/20 mb-6"> {/* Increased mb */}
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

                                        <div className="flex gap-3 items-center">
                                            {openPost.status === "pending" && (
                                                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500 text-black font-semibold">
                                                    Pending
                                                </span>
                                            )}

                                            {/* Admin controls */}
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

                                    {/* Post Content */}
                                    <div className="mb-8"> {/* Increased margin bottom */}
                                        <h2 className="text-3xl sm:text-4xl font-extrabold mb-5 leading-tight text-primary-300"> {/* Increased mb */}
                                            {openPost.title}
                                        </h2>
                                        <p className="text-base text-white/90 leading-relaxed">
                                            {openPost.description}
                                        </p>
                                    </div>

                                    {/* Post Actions */}
                                    <div className="flex gap-10 mb-8 border-y border-white/10 py-4"> {/* Increased gap and mb */}
                                        <Button
                                            variant="ghost"
                                            className={`flex items-center gap-2 transition hover:bg-white/10 p-0 ${likedPosts[openPost.id]
                                                ? "text-red-500 hover:text-red-400"
                                                : "text-white/80 hover:text-white"
                                                }`}
                                            onClick={() => handleLike(openPost.id)}
                                        >
                                            <Heart
                                                className={`w-6 h-6 transition-all ${likedPosts[openPost.id] ? "fill-red-500 scale-110" : "fill-white/10"}`}
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

                                    {/* Comments Section */}
                                    <div className="pt-6"> {/* Increased padding top */}
                                        <h4 className="text-xl font-extrabold mb-5 text-white"> {/* Increased mb */}
                                            Comments ({openPost.comments.length})
                                        </h4>

                                        {loadingPageComments ? (
                                            // Comment Skeleton (Glassy)
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
                                                    <p className="text-white/70 text-base italic"> {/* Increased text size */}
                                                        Be the first to comment!
                                                    </p>
                                                )}

                                                <div className="space-y-4">
                                                    {[...openPost.comments]
                                                        .reverse()
                                                        .slice(
                                                            (commentPage - 1) * commentsPerPage,
                                                            commentPage * commentsPerPage,
                                                        )
                                                        .map((c) => (
                                                            <div
                                                                key={c.id}
                                                                className={`flex flex-col gap-1 rounded-xl p-4 transition-shadow shadow-md ${GLASSY_COMMENT_BG}`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <UserCircle className="w-5 h-5 text-white/70" />
                                                                    <span className="text-sm font-bold text-primary-200">
                                                                        {c.commentedBy?.name || "Anonymous"}
                                                                    </span>
                                                                    <span className="text-xs text-white/50 ml-auto">
                                                                        {formatDate(c.createdAt)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-white/90 pl-7 mt-1">
                                                                    {c.text}
                                                                </p>
                                                            </div>
                                                        ))}
                                                </div>

                                                {/* Comment Pagination (Glassy) */}
                                                {Math.ceil(openPost.comments.length / commentsPerPage) >
                                                    1 && (
                                                        <div className="flex justify-center mt-6 gap-1">
                                                            {getPageWindow(
                                                                commentPage,
                                                                Math.ceil(openPost.comments.length / commentsPerPage),
                                                                5,
                                                            ).map((p) => (
                                                                <Button
                                                                    key={p}
                                                                    size="sm"
                                                                    variant={commentPage === p ? "default" : "ghost"}
                                                                    onClick={() => handleCommentPageChange(p)}
                                                                    className={`rounded-full h-8 w-8 text-sm ${commentPage === p ? "bg-primary hover:bg-primary/90" : GLASSY_BUTTON_GHOST}`}
                                                                >
                                                                    {p}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    )}
                                            </>
                                        )}

                                        {/* Add comment input (Glassy) */}
                                        <div className="mt-8 flex gap-3"> {/* Increased gap */}
                                            <Input
                                                className={GLASSY_INPUT_CLASSES}
                                                placeholder={currentUser ? "Share your thoughts..." : "Login to comment"}
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                disabled={!currentUser}
                                            />
                                            <Button
                                                className="rounded-full bg-primary hover:bg-primary/90 text-white font-semibold"
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
                <Dialog open={createOpen} onOpenChange={(open) => setCreateOpen(open)}>
                    <DialogContent className={GLASSY_MODAL_CLASSES}>
                        <DialogHeader className="pb-4 border-b border-white/10 mb-6">
                            <DialogTitle className="font-extrabold text- text-xl">Create Post</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Title"
                                className="mb-2 text-black"
                            />
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Description"
                                className="w-full min-h-[120px] rounded-lg p-4 bg-white/5 border border-white/10 text-white"
                            />
                            <div className="flex gap-2 items-center">
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="rounded-full px-4 py-2 bg-white/5 border border-white/10 text-white"
                                >
                                    {categories.filter(c => c !== "All").map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <Input
                                    value={newImageUrl}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                    className="text-black"
                                    placeholder="Image URL (optional)"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <Button
                                    variant="ghost"
                                    className="rounded-full"
                                    onClick={() => setCreateOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="rounded-full bg-primary hover:bg-primary/90 text-white font-semibold"
                                    onClick={handleCreatePost}
                                    disabled={creating}
                                >
                                    {creating ? "Creating..." : "Submit for Review"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

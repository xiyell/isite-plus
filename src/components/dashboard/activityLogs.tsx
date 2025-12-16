"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
  AlertTriangle,
  User,
} from "lucide-react";

import { db } from "@/services/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { useAuth } from "@/services/auth";

// --- Pagination Imports from the Example ---
import {
  Pagination, PaginationContent, PaginationItem,
  PaginationPrevious, PaginationLink, PaginationNext
} from "@/components/ui/pagination";

/* ───────────────────────────────────────────── */
/* CONSTANTS                                    */
/* ───────────────────────────────────────────── */

const POSTS_PER_PAGE = 10; // New constant for pagination limit

// --- Reusable Glassy Classes ---
const GLASSY_CARD = "bg-white/5 border border-white/20 backdrop-blur-md shadow-2xl";
const GLASSY_HEADER_ROW = "bg-white/10 hover:bg-white/10";
const GLASSY_HOVER_ROW = "hover:bg-white/10 transition-colors";
const TEXT_PRIMARY = "text-white";
const TEXT_SECONDARY = "text-gray-300"; // Used for subtitles/hints


/* ───────────────────────────────────────────── */
/* TYPES                                        */
/* ───────────────────────────────────────────── */

interface PendingPost {
  id: string;
  authorId: string;
  authorUsername: string;
  title: string;
  contentSnippet: string;
  timestamp: string;
  category: string;
  status: "pending" | "approved" | "rejected";
}

/* ───────────────────────────────────────────── */
/* UTILS FOR PAGINATION                          */
/* ───────────────────────────────────────────── */

// Function to generate page numbers for the pagination component (max 5 visible)
const getPageNumbers = (currentPage: number, totalPages: number, maxVisiblePages: number = 5) => {
  const pages = [];
  let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let end = Math.min(totalPages, start + maxVisiblePages - 1);

  // Adjust start if the range is pushed against the end
  if (end - start + 1 < maxVisiblePages) {
    start = Math.max(1, end - maxVisiblePages + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
};

/* ───────────────────────────────────────────── */
/* PAGE                                         */
/* ───────────────────────────────────────────── */


export default function AdminPostModerationPage() {
  const { toast } = useToast();
  const { user } = useAuth(); // must expose uid
  const [allPosts, setAllPosts] = useState<PendingPost[]>([]); // Renamed to store ALL pending posts
  const [loading, setLoading] = useState(true);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);

  /* ─────────── ADMIN CHECK ─────────── */

  async function assertAdmin(uid: string) {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists() || snap.data().role !== "admin") {

      toast({
        title: "Access Denied",
        description: "You must be an administrator to view this page.",
        variant: "destructive",
      });
      // Do not throw, just stop loading and clear posts
      setLoading(false);
      setAllPosts([]);
      throw new Error("Not authorized");
    }
  }

  /* ─────────── FETCH POSTS ─────────── */

  async function loadPendingPosts() {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await assertAdmin(user.uid);

      // NOTE: For a real production app with thousands of posts, 
      // you would use Firestore's `limit` and `startAfter` (cursor-based pagination) 
      // instead of fetching the entire list at once. We fetch all here for simplicity 
      // of front-end-only pagination.
      const q = query(
        collection(db, "community"),
        where("status", "==", "pending")
      );

      const snap = await getDocs(q);
      const results: PendingPost[] = [];

      for (const d of snap.docs) {
        const data = d.data();
        // The postedBy field is a DocumentReference, so get the path/ID
        const postedByRef = data.postedBy.path;
        const userId = postedByRef.split("/").pop() || "unknownId";

        const userSnap = await getDoc(doc(db, "users", userId));

        results.push({
          id: d.id,
          authorId: userId,
          authorUsername: userSnap.exists()
            ? userSnap.data().name
            : "Unknown User",
          title: data.title,
          contentSnippet: data.description || "No description provided.",
          timestamp: data.createdAt.toDate().toLocaleString(),
          category: data.category,
          status: data.status,
        });
      }

      // Sort posts by oldest first (assuming createdAt/timestamp is reliable)
      results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setAllPosts(results);
      setCurrentPage(1); // Reset to first page after loading
    } catch (error) {
      console.error("Error loading pending posts:", error);
    } finally {
      setLoading(false);
    }
  }

  /* ─────────── UPDATE STATUS ─────────── */

  async function updateStatus(
    postId: string,
    status: "approved" | "rejected"
  ) {
    if (!user?.uid) return;

    try {
      await assertAdmin(user.uid);

      await updateDoc(doc(db, "community", postId), {
        status,
      });

      // Update local state by removing the moderated post
      setAllPosts(prev => prev.filter(p => p.id !== postId));

      // TOAST: Action Success
      toast({
        title: `${status === "approved" ? "Approved" : "Rejected"} Post`,
        description: `Post ID: ${postId} has been successfully ${status}.`,
        variant: status === "approved" ? "success" : "destructive", // Use 'destructive' for rejection
      });

    } catch (error) {
      console.error("Error updating post status:", error);
      // TOAST: Action Failure
      toast({
        title: "Action Failed",
        description: `Could not update post status. Please check permissions.`,
        variant: "destructive",
      });
    }
  }

  /* ─────────── PAGINATION LOGIC ─────────── */

  // Memoize the calculation for total pages and the posts to display
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;

  const paginatedPosts = useMemo(() => {
    return allPosts.slice(startIndex, endIndex);
  }, [allPosts, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    return getPageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

  // Adjust current page if the list shrinks (e.g., removing the last item of a page)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
    if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  /* ─────────── EFFECT ─────────── */

  useEffect(() => {
    // Only attempt to load if user object is available (firebase auth is ready)
    if (user !== undefined) {
      loadPendingPosts();
    }
  }, [user]);

  /* ───────────────────────────────────────────── */
  /* UI                                           */
  /* ───────────────────────────────────────────── */

  if (loading && user === undefined) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Authenticating user...
      </div>
    );
  }


  return (
    <div className="min-h-screen p-8 space-y-8 bg-transparent text-white">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Community Post Moderation
        </h1>
        {/* Consistent button style */}
        <Button
          variant="ghost"
          className="text-gray-300 border border-white/30 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Clock className="h-4 w-4 mr-2 text-primary" />
          View Rejected Archive
        </Button>
      </div>

      {/* Summary Card */}
      <Card className={GLASSY_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-400 font-semibold uppercase flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Moderation Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold mb-1 text-white">
            {loading ? <Loader2 className="inline h-6 w-6 animate-spin" /> : allPosts.length}
          </div>
          <p className="text-sm text-gray-400">
            {allPosts.length > 0
              ? `Oldest pending: ${allPosts[0]?.timestamp}`
              : "Queue is currently clear."}
          </p>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className={GLASSY_CARD}>
        <CardHeader>
          <CardTitle className={TEXT_PRIMARY}>
            Pending Review Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className={GLASSY_HEADER_ROW}>
                <TableHead className={TEXT_SECONDARY}>
                  Author & Time
                </TableHead>
                <TableHead className={TEXT_SECONDARY}>
                  Post Details
                </TableHead>
                <TableHead className={`text-right ${TEXT_SECONDARY}`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10">
                    <Loader2 className="inline h-5 w-5 animate-spin mr-2 text-primary" />
                    <span className={TEXT_SECONDARY}>Loading posts...</span>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paginatedPosts.map(post => (
                    <TableRow
                      key={post.id}
                      className={GLASSY_HOVER_ROW}
                    >
                      {/* Column 1: Author & Time */}
                      <TableCell className="max-w-[150px] text-white">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <p className="font-semibold text-white truncate">{post.authorUsername}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {post.timestamp}
                        </p>
                      </TableCell>

                      {/* Column 2: Post Details */}
                      <TableCell className="max-w-xl text-white">
                        <div className="flex gap-2 mb-1">
                          <Badge
                            // Consistent badge style for pending status
                            className="bg-yellow-600/30 text-yellow-300 font-bold border border-yellow-500/50"
                          >
                            {post.category}
                          </Badge>
                          <Badge
                            className="bg-gray-500/20 text-gray-300 font-medium border border-gray-400/50"
                          >
                            Pending
                          </Badge>
                        </div>
                        <p className="text-white font-semibold mb-1">{post.title}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {post.contentSnippet}
                        </p>
                      </TableCell>

                      {/* Column 3: Actions (Aligned Together) */}
                      <TableCell className="w-[150px]">
                        {/* Wrapper for right alignment and tight grouping */}
                        <div className="flex justify-end items-center space-x-1">
                          {/* Review Button */}
                          <Button
                            size="icon" // Changed to icon for tighter grouping
                            variant="ghost"
                            className="h-8 w-8 text-indigo-400 border border-indigo-400/50 bg-indigo-900/10 hover:bg-indigo-900/20 rounded-lg transition-colors p-0"
                            onClick={() =>
                              toast({
                                title: "Feature Placeholder",
                                description: `You would open a full view modal for post ${post.id} here.`,
                                variant: "default"
                              })
                            }
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>

                          {/* Reject Button */}
                          <Button
                            size="icon" // Changed to icon for tighter grouping
                            className="h-8 w-8 bg-red-700/80 hover:bg-red-800 border border-red-500/50 p-0"
                            onClick={() =>
                              updateStatus(post.id, "rejected")
                            }
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>

                          {/* Approve Button */}
                          <Button
                            size="icon" // Changed to icon for tighter grouping
                            className="h-8 w-8 bg-green-600/80 hover:bg-green-700 border border-green-500/50 p-0"
                            onClick={() =>
                              updateStatus(post.id, "approved")
                            }
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {!loading && paginatedPosts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-green-500 py-10 text-xl font-bold"
                  >
                    Queue is empty 🎉
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Footer displaying current range and total */}
          {!loading && allPosts.length > 0 && (
            <div className="p-4 text-sm text-gray-400 border-t border-white/10">
              Showing {startIndex + 1} to {Math.min(endIndex, allPosts.length)} of {allPosts.length} pending posts.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <Pagination className="py-4">
          <PaginationContent className="bg-white/5 backdrop-blur-md border border-white/20 rounded-xl p-2">

            {/* Previous Button */}
            <PaginationItem>
              <PaginationPrevious
                className="text-white/80 hover:bg-indigo-700/30 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              />
            </PaginationItem>

            {/* Page Numbers */}
            {pageNumbers.map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  className={`
                    ${currentPage === page ? 'bg-indigo-600 text-white font-bold hover:bg-indigo-600/90' : 'text-white/80 hover:bg-indigo-700/30'}
                    transition-colors cursor-pointer
                  `}
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}

            {/* Next Button */}
            <PaginationItem>
              <PaginationNext
                className="text-white/80 hover:bg-indigo-700/30 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

    </div>
  );
}
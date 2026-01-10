"use client";

import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
/* PAGE                                         */
/* ───────────────────────────────────────────── */

// --- Reusable Glassy Classes ---
const GLASSY_CARD = "bg-white/5 border border-white/20 backdrop-blur-md shadow-2xl";
const GLASSY_HEADER_ROW = "bg-white/10 hover:bg-white/10";
const GLASSY_HOVER_ROW = "hover:bg-white/10 transition-colors";
const TEXT_PRIMARY = "text-white";
const TEXT_SECONDARY = "text-gray-300"; // Used for subtitles/hints


export default function AdminPostModerationPage() {
  const { toast } = useToast();
  const { user } = useAuth(); // must expose uid
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

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
      setPosts([]);
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

      setPosts(results);
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

      const updateData = status === 'rejected'
        ? { status: 'deleted', isDeleted: true, deletedAt: Date.now() }
        : { status: 'approved' };

      await updateDoc(doc(db, "community", postId), updateData);

      setPosts(prev => prev.filter(p => p.id !== postId));

      // TOAST: Action Success
      toast({
        title: `${status === "approved" ? "Approved" : "Rejected"} Post`,
        description: status === "approved"
          ? `Post ID: ${postId} has been successfully approved.`
          : `Post ID: ${postId} has been moved to the Trash Bin.`,
        variant: status === "approved" ? "success" : "default",
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

  /* ─────────── BATCH MODERATION ─────────── */
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all visible posts on current page
      const visiblePosts = posts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
      setSelectedPosts(visiblePosts.map(p => p.id));
    } else {
      setSelectedPosts([]);
    }
  };

  const handleSelectOne = (postId: string, checked: boolean) => {
    if (checked) {
      setSelectedPosts(prev => [...prev, postId]);
    } else {
      setSelectedPosts(prev => prev.filter(id => id !== postId));
    }
  };

  const handleBatchAction = async (action: "approve" | "reject") => {
    if (selectedPosts.length === 0) return;
    if (!confirm(`Are you sure you want to ${action} ${selectedPosts.length} posts?`)) return;

    try {
      const res = await fetch("/api/community/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: selectedPosts, action }),
      });

      if (!res.ok) throw new Error("Batch action failed");

      const data = await res.json();

      // Update local state
      setPosts(prev => prev.filter(p => !selectedPosts.includes(p.id)));
      setSelectedPosts([]);

      toast({
        title: "Batch Action Successful",
        description: data.message,
        variant: action === "approve" ? "success" : "default",
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Batch Action Failed",
        description: "Could not complete batch operation.",
        variant: "destructive",
      });
    }
  };

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
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Community Post Moderation
          </h1>
          {selectedPosts.length > 0 && (
            <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-1">
              <Button
                size="sm"
                onClick={() => handleBatchAction("approve")}
                className="bg-green-600 hover:bg-green-700 text-white border-green-500"
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Approve Selected ({selectedPosts.length})
              </Button>
              <Button
                size="sm"
                onClick={() => handleBatchAction("reject")}
                className="bg-red-600 hover:bg-red-700 text-white border-red-500"
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject Selected ({selectedPosts.length})
              </Button>
            </div>
          )}
        </div>
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
            {loading ? <Loader2 className="inline h-6 w-6 animate-spin" /> : posts.length}
          </div>
          <p className="text-sm text-gray-400">
            {posts.length > 0
              ? `Oldest pending: ${posts[0]?.timestamp}`
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
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedPosts.length > 0 && selectedPosts.length === Math.min(posts.length, ITEMS_PER_PAGE)}
                    onCheckedChange={handleSelectAll}
                    className="border-white/50 data-[state=checked]:bg-indigo-600"
                  />
                </TableHead>
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
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="inline h-5 w-5 animate-spin mr-2 text-primary" />
                    <span className={TEXT_SECONDARY}>Loading posts...</span>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {posts
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map(post => (
                      <TableRow
                        key={post.id}
                        className={GLASSY_HOVER_ROW}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedPosts.includes(post.id)}
                            onCheckedChange={(checked) => handleSelectOne(post.id, checked as boolean)}
                            className="border-white/50 data-[state=checked]:bg-indigo-600"
                          />
                        </TableCell>
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

              {!loading && posts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-green-500 py-10 text-xl font-bold"
                  >
                    Queue is empty 🎉
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {!loading && posts.length > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-white/10">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(p => p - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.ceil(posts.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={page === currentPage}
                        className={page === currentPage
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "text-gray-400 hover:text-white"
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
                        if (currentPage < Math.ceil(posts.length / ITEMS_PER_PAGE)) setCurrentPage(p => p + 1);
                      }}
                      className={currentPage === Math.ceil(posts.length / ITEMS_PER_PAGE) ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
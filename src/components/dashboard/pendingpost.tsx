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
  ShieldAlert
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
/* TYPES                                        */
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
  spamScore?: number; // 0-100 likelihood
}

/* ───────────────────────────────────────────── */
/* PAGE                                         */
/* ───────────────────────────────────────────── */

// Simple keyword-based spam heuristic
const SPAM_KEYWORDS = ["free money", "click here", "subscribe", "prize", "winner", "crypto", "bitcoin", "$$$"];

function calculateSpamScore(title: string, content: string): number {
  let score = 0;
  const text = (title + " " + content).toLowerCase();
  SPAM_KEYWORDS.forEach(word => {
    if (text.includes(word)) score += 20;
  });
  if (text === text.toUpperCase() && text.length > 10) score += 30; // ALL CAPS check
  return Math.min(score, 100);
}

const ITEMS_PER_PAGE = 5;

export default function AdminPostModerationPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
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
        const postedByRef = data.postedBy?.path;
        const userId = postedByRef ? postedByRef.split("/").pop() : "unknownId";

        let authorName = "Unknown User";
        if (userId && userId !== "unknownId") {
          const userSnap = await getDoc(doc(db, "users", userId));
          if (userSnap.exists()) authorName = userSnap.data().name;
        }

        const spamScore = calculateSpamScore(data.title || "", data.description || "");

        results.push({
          id: d.id,
          authorId: userId,
          authorUsername: authorName,
          title: data.title,
          contentSnippet: data.description || "No description provided.",
          timestamp: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : "Recently",
          category: data.category,
          status: data.status,
          spamScore,
        });
      }

      // Sort by newest first
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
      // Optimistic Update
      setPosts(prev => prev.filter(p => p.id !== postId));

      const updateData = status === 'rejected'
        ? { status: 'deleted', isDeleted: true, deletedAt: new Date(), deletedBy: doc(db, 'users', user.uid) }
        : { status: 'approved', approvedAt: new Date(), approvedBy: doc(db, 'users', user.uid) };

      await updateDoc(doc(db, "community", postId), updateData);

      toast({
        title: `${status === "approved" ? "Approved" : "Rejected"} Post`,
        description: status === "approved"
          ? `Post has been successfully approved.`
          : `Post has been moved to the Trash Bin.`,
        variant: status === "approved" ? "success" : "default",
      });

    } catch (error) {
      console.error("Error updating post status:", error);
      toast({ title: "Action Failed", variant: "destructive" });
      loadPendingPosts(); // Revert on failure
    }
  }

  /* ─────────── BATCH MODERATION ─────────── */
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
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
      // Optimistic UI update
      const toDeleteIds = [...selectedPosts];
      setPosts(prev => prev.filter(p => !toDeleteIds.includes(p.id)));
      setSelectedPosts([]);

      const res = await fetch("/api/community/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: toDeleteIds, action, userId: user?.uid }),
      });

      if (!res.ok) throw new Error("Batch action failed");
      const data = await res.json();

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
      loadPendingPosts(); // Reload on error
    }
  };

  /* ─────────── EFFECT ─────────── */

  useEffect(() => {
    if (user !== undefined) {
      loadPendingPosts();
    }
  }, [user]);

  // PAGINATION
  const paginatedPosts = posts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* ───────────────────────────────────────────── */
  /* UI                                           */
  /* ───────────────────────────────────────────── */

  if (loading && user === undefined) {
    return (
      <div className="flex items-center justify-center h-40 text-white">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading moderation queue...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white w-full"> {/* Removed min-h-screen to fit in dashboard better */}

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          {selectedPosts.length > 0 ? (
            <div className="flex gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
              <Button onClick={() => handleBatchAction("approve")} variant="default" className="bg-green-600 hover:bg-green-700 h-9 text-xs uppercase font-bold tracking-wide border border-green-500/50">
                <CheckCircle className="mr-2 h-3 w-3" /> Approve ({selectedPosts.length})
              </Button>
              <Button onClick={() => handleBatchAction("reject")} variant="destructive" className="bg-red-600 hover:bg-red-700 h-9 text-xs uppercase font-bold tracking-wide border border-red-500/50">
                <XCircle className="mr-2 h-3 w-3" /> Reject ({selectedPosts.length})
              </Button>
            </div>
          ) : (
            <div className="text-gray-400 text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-indigo-400" />
              Select items to perform mass actions
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 font-mono">
            {posts.length} PENDING
          </span>
        </div>
      </div>

      {/* BOXY GRID TABLE */}
      <div className="border border-white/20 rounded-none bg-black/20 overflow-hidden">
        <Table className="border-collapse w-full table-fixed">
          <TableHeader className="bg-white/10">
            <TableRow className="border-b border-white/20">
              <TableHead className="w-[50px] border-r border-white/10 text-center p-0">
                <div className="flex items-center justify-center h-full w-full">
                  <Checkbox
                    checked={paginatedPosts.length > 0 && selectedPosts.length >= paginatedPosts.length}
                    onCheckedChange={handleSelectAll}
                    className="border-white/50 data-[state=checked]:bg-indigo-500"
                  />
                </div>
              </TableHead>
              <TableHead className="w-[180px] border-r border-white/10 text-white font-bold uppercase tracking-wider text-xs p-4">Author</TableHead>
              <TableHead className="w-[120px] border-r border-white/10 text-white font-bold uppercase tracking-wider text-xs p-4 text-center">Category</TableHead>
              <TableHead className="border-r border-white/10 text-white font-bold uppercase tracking-wider text-xs p-4">Post Content</TableHead>
              <TableHead className="w-[100px] border-r border-white/10 text-white font-bold uppercase tracking-wider text-xs p-4 text-center">Spam Analysis</TableHead>
              <TableHead className="w-[120px] text-white font-bold uppercase tracking-wider text-xs p-4 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading posts...
                </TableCell>
              </TableRow>
            ) : paginatedPosts.length > 0 ? (
              paginatedPosts.map((post) => (
                <TableRow key={post.id} className="hover:bg-white/5 transition-colors border-b border-white/10 group">
                  {/* Checkbox */}
                  <TableCell className="border-r border-white/10 text-center p-0">
                    <div className="flex items-center justify-center h-full w-full py-4">
                      <Checkbox
                        checked={selectedPosts.includes(post.id)}
                        onCheckedChange={(c) => handleSelectOne(post.id, c as boolean)}
                        className="border-white/50 data-[state=checked]:bg-indigo-500"
                      />
                    </div>
                  </TableCell>

                  {/* Author */}
                  <TableCell className="border-r border-white/10 p-4 align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-white font-bold text-sm truncate">
                        <User size={14} className="text-gray-400" />
                        {post.authorUsername}
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">{post.timestamp}</span>
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell className="border-r border-white/10 p-4 text-center align-top">
                    <Badge variant="outline" className="border-white/20 text-white bg-white/5 text-[10px] uppercase tracking-wider">
                      {post.category}
                    </Badge>
                  </TableCell>

                  {/* Content */}
                  <TableCell className="border-r border-white/10 p-4 align-top relative">
                    <p className="font-bold text-white text-sm mb-1">{post.title}</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{post.contentSnippet}</p>
                    {post.spamScore && post.spamScore > 50 && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-red-400 font-bold bg-red-900/20 px-1.5 py-0.5 rounded border border-red-500/30">
                        <AlertTriangle size={10} /> SPAM?
                      </div>
                    )}
                  </TableCell>

                  {/* Spam Analysis */}
                  <TableCell className="border-r border-white/10 p-4 text-center align-middle">
                    <div className={`text-xs font-bold px-2 py-1 rounded inline-block ${(post.spamScore || 0) < 30 ? 'text-green-400 bg-green-900/20' :
                        (post.spamScore || 0) < 70 ? 'text-yellow-400 bg-yellow-900/20' :
                          'text-red-400 bg-red-900/20 border border-red-500/30'
                      }`}>
                      {(post.spamScore || 0) < 30 ? 'SAFE' : `${post.spamScore}% RISK`}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="p-4 align-middle text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => updateStatus(post.id, 'approved')}
                        className="p-1.5 rounded-md hover:bg-green-500/20 text-green-400 transition-colors border border-transparent hover:border-green-500/50"
                        title="Approve"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button
                        onClick={() => updateStatus(post.id, 'rejected')}
                        className="p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-colors border border-transparent hover:border-red-500/50"
                        title="Reject to Trash"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              /* Empty State */
              Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <TableRow key={i} className={`border-b border-white/10 pointer-events-none ${i === 0 ? '' : 'invisible'}`}>
                  {i === 0 ? (
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <CheckCircle className="h-10 w-10 mb-4 text-green-500/20" />
                        <p className="text-lg font-medium text-white">All caught up!</p>
                        <p className="text-sm">No pending posts to review.</p>
                      </div>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell className="p-4">&nbsp;</TableCell>
                      <TableCell className="p-4">&nbsp;</TableCell>
                      <TableCell className="p-4">&nbsp;</TableCell>
                      <TableCell className="p-4">&nbsp;</TableCell>
                      <TableCell className="p-4">&nbsp;</TableCell>
                      <TableCell className="p-4">&nbsp;</TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}

            {/* Filler Rows if not enough posts */}
            {!loading && paginatedPosts.length > 0 && Array.from({ length: Math.max(0, ITEMS_PER_PAGE - paginatedPosts.length) }).map((_, i) => (
              <TableRow key={`empty-${i}`} className="border-b border-white/10 pointer-events-none">
                <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                <TableCell className="p-4">&nbsp;</TableCell>
              </TableRow>
            ))}

          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && posts.length > ITEMS_PER_PAGE && (
        <div className="flex justify-center pt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={`cursor-pointer ${currentPage === 1 ? 'opacity-50 pointer-events-none' : ''}`} /></PaginationItem>
              <PaginationItem><span className="mx-4 text-white text-sm font-mono self-center">Page {currentPage}</span></PaginationItem>
              <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(Math.ceil(posts.length / ITEMS_PER_PAGE), p + 1))} className={`cursor-pointer ${currentPage >= Math.ceil(posts.length / ITEMS_PER_PAGE) ? 'opacity-50 pointer-events-none' : ''}`} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

    </div>
  );
}
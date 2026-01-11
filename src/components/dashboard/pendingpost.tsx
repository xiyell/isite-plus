"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/Button";
import { db } from "@/services/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
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
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  User,
  ShieldAlert
} from "lucide-react";

import { useAuth } from "@/services/auth";
import { updatePostStatus, movePostToRecycleBin, getAllPostsForModeration } from "@/actions/community";

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
  _sortTime?: number;
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
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const CATEGORIES = ["All", "General", "News", "Events", "Questions", "Feedback"];

  /* ─────────── FETCH POSTS (SERVER ACTION) ─────────── */
  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getAllPostsForModeration();
      
      const results = data.map((d: any) => {
         const spamScore = calculateSpamScore(d.title || "", d.description || "");
         
         let timestampStr = "Recently";
         let rawTime = Date.now();
         
         if (d.createdAt) {
             const date = new Date(d.createdAt);
             timestampStr = date.toLocaleString();
             rawTime = date.getTime();
         }

         return {
          id: d.id,
          authorId: d.authorId,
          authorUsername: d.authorUsername,
          title: d.title,
          contentSnippet: d.description || "No description provided.",
          timestamp: timestampStr,
          category: d.category,
          status: d.status,
          spamScore,
          _sortTime: rawTime
         };
      })
      .filter(p => {
          const s = (p.status || 'pending').toLowerCase();
          const f = statusFilter.toLowerCase();
          if (s === 'deleted') return false;
          return s === f && (categoryFilter === 'All' || p.category === categoryFilter);
      })
      .sort((a, b) => (b._sortTime || 0) - (a._sortTime || 0));

      setPosts(results as PendingPost[]);
    } catch (error) {
       console.error("Failed to fetch posts:", error);
       toast({ title: "Error", description: "Failed to load posts from server. Permissions issue resolved.", variant: "destructive" });
    } finally {
       setLoading(false);
    }
  }, [user, statusFilter, categoryFilter, toast]);

  useEffect(() => {
    if (authLoading) return;
    fetchPosts();
  }, [authLoading, fetchPosts]);

  // Expose refresh function
  async function loadPendingPosts() {
     fetchPosts();
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

      if (status === 'approved') {
        await updatePostStatus(postId, 'approved');
      } else {
        // Reject -> Recycle Bin
        await movePostToRecycleBin(postId, user.uid);
      }

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

  /* ─────────── DERIVED STATE ─────────── */

  const filteredPosts = posts.filter(p => {
    const q = searchQuery.toLowerCase();
    return !q || p.title.toLowerCase().includes(q) || p.authorUsername.toLowerCase().includes(q);
  });

  const paginatedPosts = filteredPosts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* ─────────── BATCH MODERATION ─────────── */

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPosts(paginatedPosts.map(p => p.id));
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
    if (!user) return;

    try {
      // Optimistic UI update
      const toProcessIds = [...selectedPosts];
      setPosts(prev => prev.filter(p => !toProcessIds.includes(p.id)));
      setSelectedPosts([]);

      const promises = toProcessIds.map(id => {
        if (action === 'approve') return updatePostStatus(id, 'approved');
        return movePostToRecycleBin(id, user.uid);
      });

      await Promise.all(promises);

      toast({
        title: "Batch Action Successful",
        description: `Processed ${toProcessIds.length} posts.`,
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

  /* ─────────── UI ─────────── */

  if (authLoading) { 
    return (
      <div className="flex items-center justify-center h-40 text-white">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Checking permission...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white w-full"> {/* Removed min-h-screen to fit in dashboard better */}

      {/* Filters & Actions */}
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Action Bar */}
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
                Select ({selectedPosts.length}) items to perform mass actions
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 font-mono">
              {filteredPosts.length} POSTS
            </span>
            <Button variant="ghost" size="sm" onClick={loadPendingPosts} className="h-6 text-xs text-gray-400 hover:text-white">
              Refresh
            </Button>
          </div>
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
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <CheckCircle className="h-10 w-10 mb-4 text-green-500/20" />
                    <p className="text-lg font-medium text-white">All caught up!</p>
                    <p className="text-sm">No pending posts to review.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && filteredPosts.length > ITEMS_PER_PAGE && (
        <div className="flex justify-center pt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} className={`cursor-pointer ${currentPage === 1 ? 'opacity-50 pointer-events-none' : ''}`} /></PaginationItem>
              <PaginationItem><span className="mx-4 text-white text-sm font-mono self-center">Page {currentPage}</span></PaginationItem>
              <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(Math.ceil(filteredPosts.length / ITEMS_PER_PAGE), p + 1)); }} className={`cursor-pointer ${currentPage >= Math.ceil(filteredPosts.length / ITEMS_PER_PAGE) ? 'opacity-50 pointer-events-none' : ''}`} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

    </div>
  );
}
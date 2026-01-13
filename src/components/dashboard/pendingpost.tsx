"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Activity } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const CATEGORIES = ["All", "Tech", "Gaming", "Art", "Science", "Fun", "Other"];

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

  const totalPages = Math.ceil(filteredPosts.length / ITEMS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

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
    <div className="space-y-8 text-white w-full font-outfit">
      
      {/* Filters & Actions */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 min-w-[300px] relative">
            <input
              type="text"
              placeholder="Search posts or authors..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(val: any) => { setStatusFilter(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white rounded-xl h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 z-[200]">
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white rounded-xl h-10">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 z-[200]">
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="ghost" size="icon" onClick={loadPendingPosts} className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white">
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Batch Actions Bar */}
        {selectedPosts.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <ShieldAlert className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="text-sm font-bold text-indigo-100">
                {selectedPosts.length} posts selected for moderation
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleBatchAction("reject")} variant="destructive" className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest px-4">
                Reject All
              </Button>
              <Button onClick={() => handleBatchAction("approve")} className="bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-500/20 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest px-4">
                Approve All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* POSTS LIST */}
      {loading ? (
        <div className="py-20 text-center text-white/40">
           <Activity className="h-8 w-8 animate-pulse mx-auto mb-3 opacity-20" />
           Loading posts for moderation...
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW */}
          <div className="hidden lg:block border border-white/10 rounded-2xl bg-black/40 overflow-hidden shadow-inner">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="w-[60px] text-center pl-6">
                    <Checkbox
                      checked={paginatedPosts.length > 0 && selectedPosts.length >= paginatedPosts.length}
                      onCheckedChange={handleSelectAll}
                      className="border-white/30 data-[state=checked]:bg-indigo-600"
                    />
                  </TableHead>
                  <TableHead className="w-[200px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4">Author</TableHead>
                  <TableHead className="w-[120px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4 text-center">Category</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4">Content</TableHead>
                  <TableHead className="w-[140px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4 text-center">Security</TableHead>
                  <TableHead className="w-[120px] text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-4 pr-6 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPosts.map((post) => (
                  <TableRow key={post.id} className="group hover:bg-white/5 transition-all duration-200 border-b border-white/5 last:border-0">
                    <TableCell className="text-center pl-6">
                      <Checkbox
                        checked={selectedPosts.includes(post.id)}
                        onCheckedChange={(c) => handleSelectOne(post.id, c as boolean)}
                        className="border-white/30 data-[state=checked]:bg-indigo-600"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white/90 flex items-center gap-1.5">
                          <User size={10} className="text-indigo-400" />
                          {post.authorUsername}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 italic mt-0.5">{post.timestamp}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase">
                        {post.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[400px]">
                        <p className="text-[11px] font-bold text-white mb-1 leading-tight">{post.title}</p>
                        <p className="text-[10px] text-zinc-400 line-clamp-1 italic">{post.contentSnippet}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border ${
                        (post.spamScore || 0) < 30 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        (post.spamScore || 0) < 70 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {(post.spamScore || 0) < 30 ? 'Verified' : `${post.spamScore}% Risk`}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => updateStatus(post.id, 'approved')}
                          className="h-8 w-8 flex items-center justify-center rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => updateStatus(post.id, 'rejected')}
                          className="h-8 w-8 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE VIEW */}
          <div className="lg:hidden space-y-4">
            {paginatedPosts.map((post) => (
              <div key={post.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 transition-all hover:border-indigo-500/30">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                      <User className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1 break-words">{post.authorUsername}</p>
                      <h4 className="text-xs font-bold text-white break-words">{post.title}</h4>
                    </div>
                  </div>
                  <Checkbox
                    checked={selectedPosts.includes(post.id)}
                    onCheckedChange={(c) => handleSelectOne(post.id, c as boolean)}
                    className="border-white/30 data-[state=checked]:bg-indigo-600 h-5 w-5 rounded-md shrink-0"
                  />
                </div>

                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium line-clamp-2">
                    {post.contentSnippet}
                  </p>
                </div>

                <div className="flex justify-between items-end pt-3 border-t border-white/5">
                  <div className="flex flex-col gap-1">
                    <Badge className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg px-2 py-0.5 text-[8px] font-black uppercase w-max">
                      {post.category}
                    </Badge>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                      (post.spamScore || 0) < 50 ? 'text-green-400' : 'text-red-400'
                    }`}>
                       {post.spamScore}% Spam Risk
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 bg-red-500/10 text-red-400 hover:bg-red-400/20 border border-red-500/20 rounded-xl"
                      onClick={() => updateStatus(post.id, 'rejected')}
                    >
                      <XCircle size={18} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 bg-green-500/10 text-green-400 hover:bg-green-400/20 border border-green-500/20 rounded-xl"
                      onClick={() => updateStatus(post.id, 'approved')}
                    >
                      <CheckCircle size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {paginatedPosts.length === 0 && (
            <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/5 border-dashed">
              <CheckCircle className="h-10 w-10 text-green-500/20 mx-auto mb-4" />
              <p className="text-white/40 font-medium font-outfit uppercase tracking-widest text-[10px]">All posts processed. Inbox clean.</p>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center pt-8">
          <Pagination>
            <PaginationContent className="flex-wrap justify-center gap-2">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); if(currentPage > 1) setCurrentPage(p => p - 1); }}
                  className={currentPage === 1 ? "pointer-events-none opacity-40" : "text-zinc-400 hover:text-white transition-colors cursor-pointer"}
                />
              </PaginationItem>
              
              {(() => {
                const maxVisible = 3;
                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                let end = Math.min(totalPages, start + maxVisible - 1);
                if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                const pages = [];
                for (let i = start; i <= end; i++) pages.push(i);
                return pages;
              })().map((pageNum) => (
                <PaginationItem key={pageNum}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-600/20' : 'text-zinc-500 hover:text-white'
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); if(currentPage < totalPages) setCurrentPage(p => p + 1); }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-40" : "text-zinc-400 hover:text-white transition-colors cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
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

import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";

import { getLogs, LogEntry, deleteAllLogs } from "@/actions/logs";
import { Activity, Shield, User, FileText, Settings, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/services/auth";

/* ───────────────────────── CONSTANTS ───────────────────────── */

const POSTS_PER_PAGE = 5;

const GLASSY_CARD = "bg-white/5 border border-white/20 backdrop-blur-md shadow-2xl";
const GLASSY_HEADER_ROW = "bg-white/10";
const GLASSY_HOVER_ROW = "hover:bg-white/10 transition-colors";

type SeverityLevel = "low" | "medium" | "high";
type SortField = "timestamp" | "category" | "action" | "severity" | "message";
type SortDirection = "asc" | "desc";

/* ───────────────────────── TYPES ───────────────────────── */



/* ───────────────────────── HELPERS ───────────────────────── */

const severityColor: Record<SeverityLevel, string> = {
  // Badge background colors remain to indicate severity visually, but text is white/light.
  low: "bg-green-600/30 text-white border border-green-500/50",
  medium: "bg-yellow-600/30 text-white border border-yellow-500/50",
  high: "bg-red-600/30 text-white border border-red-500/50",
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "posts": return <FileText size={16} className="text-blue-400" />;
    case "users": return <User size={16} className="text-purple-400" />;
    case "security": return <Shield size={16} className="text-red-400" />;
    case "system": return <Settings size={16} className="text-gray-400" />;
    default: return <Activity size={16} className="text-gray-400" />;
  }
};

const sanitizeMessage = (message: string) => {
  return message.replace(/\(ID: [^)]+\)/g, "").replace(/\s{2,}/g, " ").trim();
};

const getPageNumbers = (current: number, total: number, max = 3) => {
  const pages: number[] = [];
  let start = Math.max(1, current - Math.floor(max / 2));
  let end = Math.min(total, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
};

/* ───────────────────────── PAGE ───────────────────────── */

export default function ActivityLogsContent() {
  const { toast } = useToast();
  const { user } = useAuth(); // Hook for auth

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);

  // Sorting state is kept but unused in the current table structure
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<"all" | "posts" | "users" | "system">("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [severityFilter, setSeverityFilter] =
    useState<"all" | SeverityLevel>("all");

  /* ─────────────── FETCH LOGS ─────────────── */

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await getLogs();
        setLogs(data);

        setLogs(data);
      } catch (err) {
        console.error(err);
        toast({
          title: "Failed to load logs",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [toast]);

  /* ─────────────── DELETE ALL LOGS ─────────────── */

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async () => {
    if (!deletePassword || deletePassword.length < 6) {
      toast({
        title: "Password Required",
        description: "Please enter your password to confirm this action.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      
      if (!user?.uid) {
        toast({
          title: "Authentication Error",
          description: "User not authenticated or still loading.",
          variant: "destructive",
        });
        setIsDeleting(false);
        return;
      }

      const result = await deleteAllLogs(user.uid, deletePassword);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
          className: "bg-green-600 border-green-500 text-white",
        });
        setShowDeleteDialog(false);
        setDeletePassword("");
        // Refresh logs
        const data = await getLogs();
        setLogs(data);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete logs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /* ─────────────── SORT ─────────────── */
  // NOTE: This sorting logic currently sorts ALL logs in memory.

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];

      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();

      if (av < bv) return sortDirection === "asc" ? -1 : 1;
      if (av > bv) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [logs, sortField, sortDirection]);

  /* ─────────────── SEARCH & FILTER ─────────────── */

  const filteredLogs = useMemo(() => {
    // Reset to page 1 on filter/search change
    setCurrentPage(1);

    return sortedLogs.filter((log) => {
      const matchesSearch =
        search === "" ||
        log.message.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || log.category === categoryFilter;

      const matchesSeverity =
        severityFilter === "all" || log.severity === severityFilter;

      let matchesTime = true;
      if (timeFilter !== "all") {
        const now = Date.now();
        const diff = now - log.timestamp;
        if (timeFilter === "24h") matchesTime = diff <= 24 * 60 * 60 * 1000;
        else if (timeFilter === "7d") matchesTime = diff <= 7 * 24 * 60 * 60 * 1000;
        else if (timeFilter === "30d") matchesTime = diff <= 30 * 24 * 60 * 60 * 1000;
      }

      return matchesSearch && matchesCategory && matchesSeverity && matchesTime;
    });
  }, [sortedLogs, search, categoryFilter, severityFilter, timeFilter]);

  /* ─────────────── PAGINATION ─────────────── */

  const totalPages = Math.ceil(filteredLogs.length / POSTS_PER_PAGE);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredLogs.slice(start, start + POSTS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  useEffect(() => {
    if (totalPages === 0) return;
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  /* ─────────────── RENDER ─────────────── */

  return (
    // Ensure the main container text color defaults to white
    <div className="min-h-screen p-8 text-white">
      <Card className={GLASSY_CARD}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="pt-4 text-sm uppercase text-white">
              Activity Logs
            </CardTitle>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              className="bg-red-500 hover:bg-red-600 text-white border border-red-500 shadow-lg shadow-red-500/20 rounded-xl px-4 py-2 transition-all hover:scale-105 active:scale-95"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Logs
            </Button>
          </div>
        </CardHeader>

        <CardContent>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row flex-wrap gap-3 mb-6">
            <div className="flex-1 min-w-[200px]">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search logs..."
                className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 md:gap-3">
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[140px] bg-white/10 border border-white/20 text-white rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="posts">Posts</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[140px] bg-white/10 border border-white/20 text-white rounded-xl">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[140px] bg-white/10 border border-white/20 text-white rounded-xl">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table Container */}
          {loading ? (
            <div className="py-20 text-center text-white/60">
              <Activity className="h-8 w-8 animate-pulse mx-auto mb-3 opacity-20" />
              Loading activity logs...
            </div>
          ) : (
            <>
              {/* DESKTOP VIEW (Hidden on Mobile) */}
              <div className="hidden lg:block border border-white/10 rounded-xl bg-black/40 overflow-hidden shadow-inner font-outfit">
                <Table className="table-fixed w-full">
                  <TableHeader className="bg-white/5 disabled:pointer-events-none">
                    <TableRow className="border-b border-white/10 hover:bg-transparent">
                      <TableHead className="w-[180px] text-white font-bold uppercase tracking-widest text-[10px] py-4 pl-6">Timestamp</TableHead>
                      <TableHead className="w-[120px] text-white font-bold uppercase tracking-widest text-[10px] py-4">Category</TableHead>
                      <TableHead className="w-[180px] text-white font-bold uppercase tracking-widest text-[10px] py-4">Actor</TableHead>
                      <TableHead className="w-[180px] text-white font-bold uppercase tracking-widest text-[10px] py-4">Action</TableHead>
                      <TableHead className="w-[100px] text-center text-white font-bold uppercase tracking-widest text-[10px] py-4">Severity</TableHead>
                      <TableHead className="text-white font-bold uppercase tracking-widest text-[10px] py-4 pr-6">Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log.id} className="group hover:bg-white/5 transition-all duration-200 border-b border-white/5 last:border-0 h-16">
                        <TableCell className="pl-6 font-mono text-[11px] text-white">{log.time}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(log.category)}
                            <span className="capitalize text-[11px] font-bold tracking-tight text-white/90">{log.category}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                             <span className="text-[11px] font-bold text-white/90 truncate max-w-[150px]" title={log.actorName}>{log.actorName}</span>
                             <span className="text-[9px] uppercase tracking-tighter text-indigo-400/70 font-black">{log.actorRole}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] font-medium text-white/70 block truncate max-w-[150px]" title={log.action}>{log.action}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${severityColor[log.severity] || severityColor.low} rounded-full px-2 py-0.5 text-[9px] font-black uppercase shadow-lg shadow-black/40 border-0`}>
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 relative group cursor-help overflow-visible">
                          <div className="text-[11px] text-white truncate max-w-[300px] leading-relaxed">
                              {sanitizeMessage(log.message)}
                          </div>
                          
                          <div className="absolute right-full bottom-0 mb-8 mr-2 w-[350px] p-4 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl text-white text-[11px] z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-normal break-words backdrop-blur-3xl">
                              <p className="font-bold text-indigo-400 mb-2 uppercase tracking-widest text-[9px]">Full Log Description</p>
                              {sanitizeMessage(log.message)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE TABLET VIEW (Responsive Cards) */}
              <div className="lg:hidden space-y-4">
                {paginatedLogs.map((log) => (
                  <div key={log.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 transition-all hover:border-indigo-500/30">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                          {getCategoryIcon(log.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1 break-words">{log.category}</p>
                          <h4 className="text-xs font-bold text-white break-all capitalize">{log.action.replace(/_/g, " ")}</h4>
                        </div>
                      </div>
                      <Badge className={`${severityColor[log.severity] || severityColor.low} rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase border-0 shrink-0`}>
                        {log.severity}
                      </Badge>
                    </div>

                    <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                      <p className="text-xs text-white leading-relaxed font-medium">
                        {sanitizeMessage(log.message)}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end pt-2 border-t border-white/5 gap-3">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[9px] text-white uppercase font-black tracking-tighter mb-0.5">Actor</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold text-white truncate" title={log.actorName}>{log.actorName}</span>
                          <span className="text-[8px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md font-black uppercase shrink-0">{log.actorRole}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-white italic shrink-0">{log.time.split(',')[1].trim()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {paginatedLogs.length === 0 && (
                <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/5 border-dashed">
                  <Activity className="h-10 w-10 text-white/10 mx-auto mb-4" />
                  <p className="text-white/40 font-medium">No results found for your search criteria.</p>
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent className="flex-wrap justify-center gap-2">
                  <PaginationItem>
                    <PaginationPrevious // Replaced button with PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage((p) => Math.max(1, p - 1));
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                    />
                  </PaginationItem>

                  {pageNumbers.map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink // Replaced button with PaginationLink
                        href="#"
                        isActive={p === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(p);
                        }}
                        className={p === currentPage
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "text-gray-400 hover:text-white"
                        }
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext // Replaced button with PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage((p) => Math.min(totalPages, p + 1));
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete All Logs Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <h3 className="text-xl font-bold text-white">Delete All Logs?</h3>
            </div>
            
            <p className="text-white mb-4">
              This action will permanently delete <span className="text-red-400 font-bold">ALL</span> activity logs. 
              This cannot be undone.
            </p>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-300 font-medium">
                ⚠️ <span className="font-bold">CRITICAL ACTION</span>: Only administrators can perform this operation.
              </p>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-white">
                Enter your password to confirm:
              </label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                className="bg-white/10 border-white/20 text-white"
                disabled={isDeleting}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletePassword("");
                }}
                variant="ghost"
                disabled={isDeleting}
                className="flex-1 border border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAll}
                disabled={isDeleting || !deletePassword}
                className="flex-1 bg-red-800 hover:bg-red-900 text-white border border-red-700 shadow-lg shadow-red-900/20"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
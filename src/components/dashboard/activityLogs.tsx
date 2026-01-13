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

import { getLogs, LogEntry } from "@/actions/logs";
import { Activity, Shield, User, FileText, Settings } from "lucide-react";

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

const getPageNumbers = (current: number, total: number, max = 5) => {
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
          {/* Card Title - Changed text-gray-400 to text-gray-300/text-white */}
          <CardTitle className=" pt-4 text-sm uppercase text-white">
            Activity Logs
          </CardTitle>
        </CardHeader>

        <CardContent>

          {/* Search & Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search logs..."
              // Placeholder and input text are now white
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white"
            />

            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
              <SelectTrigger className="w-[160px] bg-white/10 border border-white/20 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                <SelectItem value="all" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">All Categories</SelectItem>
                <SelectItem value="posts" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Posts</SelectItem>
                <SelectItem value="users" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Users</SelectItem>
                <SelectItem value="system" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
              <SelectTrigger className="w-[160px] bg-white/10 border border-white/20 text-white">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                <SelectItem value="all" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">All Severities</SelectItem>
                <SelectItem value="low" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Low</SelectItem>
                <SelectItem value="medium" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Medium</SelectItem>
                <SelectItem value="high" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">High</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as any)}>
              <SelectTrigger className="w-[160px] bg-white/10 border border-white/20 text-white">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                <SelectItem value="all" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">All Time</SelectItem>
                <SelectItem value="24h" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Last 24 Hours</SelectItem>
                <SelectItem value="7d" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-10 text-center text-white">Loading logs…</div>
          ) : (
            <div className="border border-white/20 rounded-none bg-black/20 overflow-hidden">
              <Table className="border-collapse w-full table-fixed">
                <TableHeader className="bg-white/10">
                  <TableRow className="border-b border-white/20">
                    <TableHead className="w-[150px] text-white font-bold uppercase tracking-wider text-[11px] p-3">Time</TableHead>
                    <TableHead className="w-[100px] text-white font-bold uppercase tracking-wider text-[11px] p-3">Category</TableHead>
                    <TableHead className="w-[150px] text-white font-bold uppercase tracking-wider text-[11px] p-3">Actor</TableHead>
                    <TableHead className="w-[150px] text-white font-bold uppercase tracking-wider text-[11px] p-3">Action</TableHead>
                    <TableHead className="w-[100px] text-white font-bold uppercase tracking-wider text-[11px] p-3 text-center">Severity</TableHead>
                    <TableHead className="text-white font-bold uppercase tracking-wider text-[11px] p-3">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="group hover:bg-white/5 transition-colors border-b border-white/10">
                      
                      {/* Time */}
                      <TableCell className="p-3 font-mono text-[11px] text-gray-300 whitespace-nowrap align-middle">
                        {log.time}
                      </TableCell>

                      {/* Category */}
                      <TableCell className="p-3 text-white align-middle">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(log.category)}
                          <span className="capitalize text-xs font-medium">{log.category}</span>
                        </div>
                      </TableCell>

                      {/* Actor */}
                      <TableCell className="p-3 text-white align-middle">
                         <div className="w-[140px] truncate">
                           <span className="font-semibold text-xs py-1" title={log.actorName}>{log.actorName}</span>
                           <span className="block text-gray-400 text-[10px] uppercase">{log.actorRole}</span>
                         </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="p-3 text-gray-300 align-middle">
                        <div className="w-[140px] truncate text-xs font-medium" title={log.action}>
                          {log.action}
                        </div>
                      </TableCell>

                      {/* Severity */}
                      <TableCell className="p-3 text-center align-middle">
                        <div className="flex justify-center">
                            <Badge className={`${severityColor[log.severity] || severityColor.low} rounded-sm px-2 py-0.5 text-[10px] uppercase shadow-none border-0`}>
                            {log.severity}
                            </Badge>
                        </div>
                      </TableCell>

                      {/* Message (Strict Truncation) */}
                      <TableCell className="p-3 text-gray-300 align-middle relative group cursor-help">
                        <div className="w-[280px] truncate text-xs">
                            {log.message}
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute right-full top-0 mr-2 w-[300px] p-3 bg-slate-900 border border-slate-700 rounded-md shadow-xl text-white text-xs z-50 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-normal break-words text-left">
                            {log.message}
                        </div>
                      </TableCell>

                    </TableRow>
                  ))}

                  {/* Empty Rows Padding to maintain height */}
                  {Array.from({ length: Math.max(0, POSTS_PER_PAGE - paginatedLogs.length) }).map((_, index) => (
                    <TableRow key={`empty-${index}`} className="border-b border-white/10 pointer-events-none">
                      <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                      <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                      <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                      <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                      <TableCell className="border-r border-white/10 p-4">&nbsp;</TableCell>
                      <TableCell className="p-4">&nbsp;</TableCell>
                    </TableRow>
                  ))}

                  {paginatedLogs.length === 0 && filteredLogs.length === 0 && (
                    <TableRow className="absolute inset-x-0 mt-16 border-none pointer-events-none">
                      <TableCell colSpan={6} className="text-center text-gray-500 border-none">
                        No logs found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
    </div>
  );
}
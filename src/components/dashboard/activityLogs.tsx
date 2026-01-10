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

import { db } from "@/services/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

/* ───────────────────────── CONSTANTS ───────────────────────── */

const POSTS_PER_PAGE = 5;

const GLASSY_CARD = "bg-white/5 border border-white/20 backdrop-blur-md shadow-2xl";
const GLASSY_HEADER_ROW = "bg-white/10";
const GLASSY_HOVER_ROW = "hover:bg-white/10 transition-colors";

type SeverityLevel = "low" | "medium" | "high";
type SortField = "timestamp" | "category" | "action" | "severity" | "message";
type SortDirection = "asc" | "desc";

/* ───────────────────────── TYPES ───────────────────────── */

interface LogEntry {
  id: string;
  category: "posts" | "users" | "system";
  action: string;
  severity: SeverityLevel;
  message: string;
  time: string;
  timestamp: number;
}

/* ───────────────────────── HELPERS ───────────────────────── */

const severityColor: Record<SeverityLevel, string> = {
  // Badge background colors remain to indicate severity visually, but text is white/light.
  low: "bg-green-600/30 text-white border border-green-500/50",
  medium: "bg-yellow-600/30 text-white border border-yellow-500/50",
  high: "bg-red-600/30 text-white border border-red-500/50",
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
  const [severityFilter, setSeverityFilter] =
    useState<"all" | SeverityLevel>("all");

  /* ─────────────── FETCH LOGS ─────────────── */

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "activitylogs"),
          orderBy("timestamp", "desc")
        );

        const snap = await getDocs(q);

        const data: LogEntry[] = snap.docs.map((doc) => {
          const d: any = doc.data();
          return {
            id: doc.id,
            category: d.category ?? "system",
            action: d.action ?? "",
            severity: d.severity ?? "low",
            message: d.message ?? "",
            timestamp: d.timestamp ?? Date.now(),
            time: d.time ?? new Date(d.timestamp).toLocaleString(),
          };
        });

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

      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [sortedLogs, search, categoryFilter, severityFilter]);

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
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="posts">Posts</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as any)}>
              <SelectTrigger className="w-[160px] bg-white/10 border border-white/20 text-white">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-10 text-center text-white">Loading logs…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className={GLASSY_HEADER_ROW}>
                  {/* Table Heads - Changed text-gray-400 to text-white */}
                  <TableHead className="text-white">Time</TableHead>
                  <TableHead className="text-white">Category</TableHead>
                  <TableHead className="text-white">Action</TableHead>
                  <TableHead className="text-white">Severity</TableHead>
                  <TableHead className="text-right text-white">Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log.id} className={GLASSY_HOVER_ROW}>
                    {/* Table Cells - Default text-white from parent div */}
                    <TableCell className="text-white">{log.time}</TableCell>
                    <TableCell className="capitalize text-white">{log.category}</TableCell>
                    <TableCell className="text-white">{log.action}</TableCell>
                    <TableCell className="text-white">
                      {/* Badge text color is now white via severityColor definition */}
                      <Badge className={severityColor[log.severity]}>
                        {log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-white">{log.message}</TableCell>
                  </TableRow>
                ))}

                {paginatedLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-white">
                      No logs match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
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
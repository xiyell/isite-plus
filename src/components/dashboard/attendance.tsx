'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Calendar, Activity, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";



type AttendanceRecord = {
    id: string; // Unique ID from database
    idNumber: string;
    name: string;
    yearLevel: string;
    section: string;
    timestamp: string;
};

// Helper to format time
const formatTime = (timestamp: string) => {
    try {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
        });
    } catch {
        return 'N/A';
    }
};

type SortKeys = 'name' | 'idNumber' | 'timestamp';
type SortOrder = 'asc' | 'desc';

import { getAttendance, getAttendanceSheets } from "@/actions/attendance";

// Re-using the Glassy Card class for consistency (Dark Theme)
const GLASSY_CARD_CLASS =
    "p-6 sm:p-8 rounded-2xl border border-slate-700 bg-black/10 shadow-2xl backdrop-blur-xl w-full max-w-sm md:max-w-7xl";

// Input component (Updated ring and placeholder color)
const Input = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        className={cn(
            "flex h-11 w-full rounded-lg border border-input bg-transparent px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            "border-slate-700 bg-black/30 text-slate-100 focus-visible:ring-cyan-500 placeholder:text-slate-400 transition-colors",
            className,
        )}
        {...props}
    />
));
Input.displayName = "Input";

// --- Main Component: AttendanceTracker ---

export default function AttendanceTracker() {
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [eventList, setEventList] = useState<string[]>([]); // New state for list of sheet titles
    const [selectedDate, setSelectedDate] = useState<string>(''); // Selected sheet title (e.g., '2025_12_14')
    const [loading, setLoading] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortKey, setSortKey] = useState<SortKeys>('timestamp');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // Helper to format sheet name (2025_12_14) to display date (Dec 14, 2025)
    const formatSheetTitle = (title: string): string => {
        try {
            const [year, month, day] = title.split('_');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return title;
        }
    };

    // 1. Fetch available sheet titles (Events)
    const fetchEvents = useCallback(async () => {
        setLoadingEvents(true);
        try {
            const data = await getAttendanceSheets();
            setEventList([...data].reverse()); // Reverse to show latest event first

            // Set the latest event as the default selected date
            if (data.length > 0) {
                setSelectedDate(data[data.length - 1]);
            } else {
                setSelectedDate('');
            }
        } catch (e: unknown) {
            const err = e as Error;
            setError(`Event list error: ${err.message}`);
        } finally {
            setLoadingEvents(false);
        }
    }, []);

    // 2. Fetch attendance data for the selected event/sheet
    const fetchAttendanceData = useCallback(async (sheetName: string) => {
        if (!sheetName) {
            setAttendanceData([]);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const data = await getAttendance(sheetName);
            setAttendanceData(data);
        } catch (e: unknown) {
            const err = e as Error;
            setError(err.message);
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load: fetch events
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Trigger attendance fetch when selectedDate (sheet name) changes
    useEffect(() => {
        if (selectedDate) {
            fetchAttendanceData(selectedDate);
        }
    }, [selectedDate, fetchAttendanceData]);

    // Sorting logic (Unchanged)
    const handleSort = (key: SortKeys) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const filteredAndSortedData = useMemo(() => {
        // ... (Same filter/sort logic as before)
        const filtered = attendanceData.filter(record =>
            record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.idNumber.includes(searchTerm) ||
            record.yearLevel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.section.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const sorted = filtered.sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [attendanceData, searchTerm, sortKey, sortOrder]);


    // Icon for sorting indicator
    const SortIcon = ({ currentKey }: { currentKey: SortKeys }) => {
        if (currentKey !== sortKey) return null;
        return (
            <span className="ml-1 text-indigo-400">
                {sortOrder === 'asc' ? '▲' : '▼'}
            </span>
        );
    };

    const paginatedData = useMemo(() => {
        return filteredAndSortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredAndSortedData, currentPage]);

    useEffect(() => {
        const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);
        if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
    }, [filteredAndSortedData.length, currentPage]);

    // --- Render Section ---

    return (
        <div className="space-y-8 text-white w-full font-outfit max-w-7xl mx-auto px-4 py-8">
            {/* Header & Status Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 text-white">
                        Attendance Logs
                    </h1>
                    <p className="text-zinc-400 text-sm md:text-base font-medium">
                        Real-time tracking of student entries and event participation.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-between backdrop-blur-xl shadow-2xl">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Total Attendees</span>
                        <h2 className="text-3xl font-black text-white">{loadingEvents ? '-' : filteredAndSortedData.length}</h2>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
                        <UserPlus className="h-6 w-6 text-indigo-400" />
                    </div>
                </div>
            </div>

            {/* Event Selection & Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:min-w-[240px]">
                        <Select
                            value={selectedDate}
                            onValueChange={(value) => { setSelectedDate(value); setCurrentPage(1); }}
                            disabled={eventList.length === 0}
                        >
                            <SelectTrigger className="w-full h-11 bg-white/5 border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50">
                                <SelectValue placeholder="Select Event/Sheet" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 z-[200]">
                                {eventList.map((sheetTitle) => (
                                    <SelectItem key={sheetTitle} value={sheetTitle}>
                                        {formatSheetTitle(sheetTitle)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative flex-1 sm:min-w-[300px]">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <Input
                            type="text"
                            placeholder="Search name, ID, or section..."
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl text-white pl-11 h-11 focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600"
                        />
                    </div>
                </div>
            </div>

            {/* ATTENDANCE DATA */}
            {loading ? (
                <div className="py-20 text-center text-white/40">
                    <Activity className="h-8 w-8 animate-pulse mx-auto mb-3 opacity-20" />
                    Fetching attendance records...
                </div>
            ) : (
                <>
                    {/* DESKTOP VIEW */}
                    <div className="hidden lg:block border border-white/10 rounded-2xl bg-black/40 overflow-hidden shadow-inner font-outfit">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-b border-white/10 hover:bg-transparent">
                                    <TableHead
                                        className="cursor-pointer hover:text-white text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5 pl-6"
                                        onClick={() => handleSort('timestamp')}
                                    >
                                        <div className="flex items-center gap-2">Scan Time <SortIcon currentKey="timestamp" /></div>
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer hover:text-white text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">Name <SortIcon currentKey="name" /></div>
                                    </TableHead>
                                    <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5">
                                        ID Number
                                    </TableHead>
                                    <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5">
                                        Level
                                    </TableHead>
                                    <TableHead className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] py-5 pr-6">
                                        Section
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.map((record) => (
                                    <TableRow
                                        key={record.id}
                                        className="group hover:bg-white/5 transition-all duration-200 border-b border-white/5 last:border-0 h-16"
                                    >
                                        <TableCell className="pl-6 font-mono text-indigo-400 font-bold text-[11px]">
                                            {formatTime(record.timestamp)}
                                        </TableCell>
                                        <TableCell className="font-bold text-white/90 text-[11px]">
                                            {record.name}
                                        </TableCell>
                                        <TableCell className="text-zinc-400 text-[11px] font-medium">
                                            {record.idNumber}
                                        </TableCell>
                                        <TableCell className="text-zinc-400 text-[11px] font-medium uppercase">
                                            {record.yearLevel}
                                        </TableCell>
                                        <TableCell className="pr-6 text-zinc-400 text-[11px] font-medium">
                                            {['1','2','3','4'].includes(record.section) ? `Section ${record.section}` : record.section}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* MOBILE VIEW */}
                    <div className="lg:hidden space-y-4">
                        {paginatedData.map((record) => (
                            <div key={record.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 transition-all hover:border-indigo-500/30">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/10 shrink-0">
                                            <Calendar className="h-4 w-4 text-indigo-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1 break-words">Time: {formatTime(record.timestamp)}</p>
                                            <h4 className="text-xs font-bold text-white break-words">{record.name}</h4>
                                        </div>
                                    </div>
                                    <Badge className="bg-white/5 text-zinc-400 border-white/10 text-[8px] uppercase font-black px-2 py-0.5 rounded-lg shrink-0">
                                        {record.idNumber}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-zinc-500 uppercase font-black tracking-tighter">Year & Section</span>
                                        <span className="text-[10px] font-bold text-white/90">
                                            {record.yearLevel.toUpperCase()} — {record.section}
                                        </span>
                                    </div>
                                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                        <CheckCircle size={14} className="text-green-500" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {paginatedData.length === 0 && (
                        <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/5 border-dashed">
                            <Search className="h-10 w-10 text-zinc-500/20 mx-auto mb-4" />
                            <p className="text-white/40 font-medium font-outfit uppercase tracking-widest text-[10px]">No records found for this criteria.</p>
                        </div>
                    )}
                </>
            )}

            {/* Pagination Controls */}
            {Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE) > 1 && (
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
                            
                            {Array.from({ length: Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                <PaginationItem key={i}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-8 w-8 p-0 rounded-lg text-xs font-bold transition-all ${
                                            currentPage === i + 1 ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-600/20' : 'text-zinc-500 hover:text-white'
                                        }`}
                                        onClick={() => setCurrentPage(i + 1)}
                                    >
                                        {i + 1}
                                    </Button>
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); if(currentPage < Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE)) setCurrentPage(p => p + 1); }}
                                    className={currentPage >= Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE) ? "pointer-events-none opacity-40" : "text-zinc-400 hover:text-white transition-colors cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}

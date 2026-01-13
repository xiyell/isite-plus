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



type AttendanceRecord = {
    id: string; // Unique ID from database
    idNumber: string;
    name: string;
    yearLevel: string;
    section: string;
    timestamp: string;
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


    // Helper for formatting time (Unchanged)
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

    // Icon for sorting indicator (Unchanged)
    const SortIcon = ({ currentKey }: { currentKey: SortKeys }) => {
        if (currentKey !== sortKey) return null;
        return (
            <span className="ml-1">
                {sortOrder === 'asc' ? '▲' : '▼'}
            </span>
        );
    };

    // --- Render Section ---

    return (
        <div className="flex flex-col items-center justify-start min-h-screen text-slate-100 px-4 py-8 sm:py-12 md:py-16 ">
            {/* Event Selection and Summary Card */}
            <div className={cn(GLASSY_CARD_CLASS, "mb-8")}>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">

                    {/* Event Select Dropdown */}
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="event-select" className="block text-sm font-medium text-slate-300 mb-1">
                            Select Event/Sheet
                        </label>
                        {loadingEvents ? (
                            <div className="h-11 flex items-center justify-center text-cyan-400 border border-slate-700 rounded-lg bg-black/30">
                                Loading events...
                            </div>
                        ) : (
                            <Select
                                value={selectedDate}
                                onValueChange={(value) => setSelectedDate(value)}
                                disabled={eventList.length === 0}
                            >
                                <SelectTrigger className="w-full h-11 bg-black/30 border-slate-700 text-slate-100 rounded-lg">
                                    <SelectValue placeholder="Select Event" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 z-[200]">
                                    {eventList.length === 0 ? (
                                        <SelectItem value="none" disabled>No events available</SelectItem>
                                    ) : (
                                        eventList.map((sheetTitle) => (
                                            <SelectItem 
                                                key={sheetTitle} 
                                                value={sheetTitle}
                                                className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0"
                                            >
                                                {formatSheetTitle(sheetTitle)}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Summary Display (Updated Background Color) */}
                    <div className="text-center sm:text-right p-3 rounded-lg bg-indigo-700/50 min-w-[150px] shadow-lg">
                        <p className="text-3xl font-extrabold text-white">
                            {loadingEvents ? '-' : filteredAndSortedData.length}
                        </p>
                        <p className="text-sm text-slate-200">
                            Total Attendees
                        </p>
                    </div>
                </div>
            </div>

            {/* Attendance List Area */}
            <div className={cn(GLASSY_CARD_CLASS, "p-4 sm:p-6")}>
                {/* Search Bar */}
                <div className="mb-4">
                    <Input
                        type="text"
                        placeholder="Search by Name, ID, Year, or Section..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>

                {loading && (
                    <p className="text-center text-cyan-400 p-8">Loading attendance...</p>
                )}

                {error && (
                    <p className="text-center text-red-400 p-8">Error: {error}</p>
                )}

                {!loading && !error && attendanceData.length === 0 && (
                    <p className="text-center text-slate-400 p-8">
                        {selectedDate
                            ? `No attendance recorded for ${formatSheetTitle(selectedDate)}.`
                            : "Select an event or check API configuration."}
                    </p>
                )}

                {/* Table/List View */}
                {!loading && attendanceData.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-700">
                            <thead>
                                <tr className="text-left text-xs sm:text-sm font-medium text-slate-300 uppercase tracking-wider bg-black/20">
                                    <th
                                        scope="col"
                                        className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                                        onClick={() => handleSort('timestamp')}
                                    >
                                        Scan Time <SortIcon currentKey="timestamp" />
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-4 py-3 cursor-pointer hover:text-cyan-400 transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        Name <SortIcon currentKey="name" />
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        ID Number
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Level
                                    </th>
                                    <th scope="col" className="px-4 py-3">
                                        Section
                                    </th>
                                </tr>
                            </thead>
                            <AnimatePresence initial={false}>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredAndSortedData
                                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                                        .map((record) => (
                                            <motion.tr
                                                key={record.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -100 }}
                                                transition={{ duration: 0.2 }}
                                                className="hover:bg-black/40 transition-colors text-sm sm:text-base text-slate-100" // Main text color
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap font-mono text-cyan-400"> {/* Highlight color for time */}
                                                    {formatTime(record.timestamp)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-semibold">
                                                    {record.name}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-400"> {/* Secondary color for ID */}
                                                    {record.idNumber}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {record.yearLevel}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {['1','2','3','4'].includes(record.section) ? `Section ${record.section}` : record.section}
                                                </td>
                                            </motion.tr>
                                        ))}
                                </tbody>
                            </AnimatePresence>
                        </table>
                        {filteredAndSortedData.length === 0 && searchTerm && (
                            <p className="text-center text-slate-500 p-4">
                                No results found for "{searchTerm}".
                            </p>
                        )}

                        {/* Pagination Controls */}
                        {Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE) > 1 && (
                            <div className="py-4 flex justify-center">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentPage(p => Math.max(1, p - 1));
                                                }}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50 text-gray-400" : "cursor-pointer text-gray-300 hover:text-white"}
                                                aria-label="Previous page"
                                            />
                                        </PaginationItem>
                                        
                                        {Array.from({ length: Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setCurrentPage(page);
                                                    }}
                                                    isActive={page === currentPage}
                                                    className={page === currentPage
                                                        ? "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 hover:text-white"
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
                                                    setCurrentPage(p => Math.min(Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE), p + 1));
                                                }}
                                                className={currentPage >= Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE) ? "pointer-events-none opacity-50 text-gray-400" : "cursor-pointer text-gray-300 hover:text-white"}
                                                aria-label="Next page"
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </div>
                )}
            </div>

    
        </div>
    );
}
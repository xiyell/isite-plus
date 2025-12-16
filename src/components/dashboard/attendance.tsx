'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";



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
            // *** COLOR ADJUSTMENTS HERE ***
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
            const res = await fetch(`/api/events`);
            if (!res.ok) {
                throw new Error("Failed to fetch event list.");
            }
            const data: string[] = await res.json();
            setEventList(data.reverse()); // Reverse to show latest event first

            // Set the latest event as the default selected date
            if (data.length > 0) {
                setSelectedDate(data[0]);
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
    const fetchAttendance = useCallback(async (sheetName: string) => {
        if (!sheetName) {
            setAttendanceData([]);
            return;
        }
        setLoading(true);
        setError(null);
        setAttendanceData([]);

        try {
            // Note: The GET API expects the sheet name to be passed as 'sheetDate'
            const res = await fetch(`/api/attendance?sheetDate=${sheetName}`);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                if (res.status === 404) {
                    throw new Error(`Sheet '${formatSheetTitle(sheetName)}' not found.`);
                }
                throw new Error(err.error || "Failed to fetch attendance data.");
            }

            const data: AttendanceRecord[] = await res.json();
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
            fetchAttendance(selectedDate);
        }
    }, [selectedDate, fetchAttendance]);

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
                            <select
                                id="event-select"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={"w-full h-11 rounded-lg border border-slate-700 bg-black/30 px-4 text-base appearance-none text-slate-100 cursor-pointer"}
                                disabled={eventList.length === 0}
                            >
                                {eventList.length === 0 ? (
                                    <option value="">No events available</option>
                                ) : (
                                    eventList.map((sheetTitle) => (
                                        <option key={sheetTitle} value={sheetTitle}>
                                            {formatSheetTitle(sheetTitle)}
                                        </option>
                                    ))
                                )}
                            </select>
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
                                    <th scope="col" className="px-4 py-3 hidden sm:table-cell">
                                        Level
                                    </th>
                                    <th scope="col" className="px-4 py-3 hidden md:table-cell">
                                        Section
                                    </th>
                                </tr>
                            </thead>
                            <AnimatePresence initial={false}>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredAndSortedData.map((record) => (
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
                                            <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                                                {record.yearLevel}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                                                {record.section}
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
                    </div>
                )}
            </div>

            <p className="mt-8 text-slate-500 text-sm">
                *Data fetched from the `/api/attendance` endpoint.
            </p>
        </div>
    );
}
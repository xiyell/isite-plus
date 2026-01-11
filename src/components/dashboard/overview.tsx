"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Upload, Server, Loader2 } from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

// --- FIREBASE IMPORTS (Adjust path as necessary) ---
import { db } from "@/services/firebase";
import { collection, getDocs, query, Timestamp, onSnapshot, doc } from "firebase/firestore";
import { getAttendance, getAttendanceSheets } from "@/actions/attendance";

// --- TYPE DEFINITIONS ---
interface OverviewStats {
    totalUsers: number;
    totalPosts: number;
    pendingPosts: number;
    serverUptime: string;
}

interface MonthlyData {
    monthYear: string; // e.g., "Dec 2025"
    posts: number;
}

// --- MOCK CHART DATA (Used for platform distribution, as it requires a different query) ---
const platformData = [
    { name: 'Website', value: 540, color: '#8b5cf6' }, // Purple
    { name: 'Facebook', value: 780, color: '#3b82f6' }, // Blue
    { name: 'Instagram', value: 310, color: '#ec4899' }, // Pink
    { name: 'Twitter', value: 770, color: '#06b6d4' }, // Cyan
];

const GLASSY_CARD_CLASS = "bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-lg shadow-black/20";


export default function OverviewContent() {
    const [attendanceData, setAttendanceData] = useState<{ name: string; value: number; color: string }[]>([]);
    const [latestEventDate, setLatestEventDate] = useState<string>("");

    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [monthlyPostData, setMonthlyPostData] = useState<MonthlyData[]>([]);
    const [loading, setLoading] = useState(true);

    const formatTimestampToMonthYear = (timestamp: Timestamp): string => {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };



    const [presence, setPresence] = useState({ online: true, lastChecked: new Date() });

    // --- 1. Real-time Users Listener ---
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
            const count = snapshot.size;
            setStats(prev => ({ 
                ...prev!, 
                totalUsers: count,
                totalPosts: prev?.totalPosts || 0,
                pendingPosts: prev?.pendingPosts || 0,
                serverUptime: "Online (99.9%)"
            }));
            setLoading(false);
        }, (err) => {
             console.error("Users listener error:", err);
             setStats(prev => ({ ...prev!, totalUsers: 0, totalPosts: 0, pendingPosts: 0, serverUptime: "Error" }));
        });
        return () => unsub();
    }, []);

    // --- 2. Real-time Posts Listener ---
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "community"), (snapshot) => {
            let total = 0;
            let pending = 0;

            // For Chart Aggregation
            const rawPosts: { timestamp: Timestamp, title: string }[] = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.title) {
                    total++;
                    if (data.status === "pending") pending++;
                    if (data.createdAt) {
                        rawPosts.push({ timestamp: data.createdAt, title: data.title });
                    }
                }
            });

            // Update Aggregated Chart Data
            // 1. Sort by date
            rawPosts.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
            // 2. Aggregate
            const counts: { [key: string]: number } = {};
            rawPosts.forEach(p => {
                const date = p.timestamp ? p.timestamp.toDate() : new Date(); // Safety fallback
                const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                counts[key] = (counts[key] || 0) + 1;
            });
            const chartData: MonthlyData[] = Object.keys(counts).map(key => ({
                monthYear: key,
                posts: counts[key]
            }));

            setMonthlyPostData(chartData);

            setStats(prev => ({ 
                ...prev!, 
                totalUsers: prev?.totalUsers || 0,
                totalPosts: total,
                pendingPosts: pending,
                serverUptime: "Online (99.9%)"
            }));
        });
        return () => unsub();
    }, []);

    const [attendedCount, setAttendedCount] = useState<number | null>(null);

    // --- 3. Attendance (Fetched directly from latest Sheet) ---
    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                // 1. Get all sheets
                const sheets = await getAttendanceSheets();
                // 2. Filter for date-based sheets (YYYY_MM_DD) and Sort Descending
                const validSheets = sheets
                    .filter(s => /^\d{4}_\d{2}_\d{2}$/.test(s))
                    .sort().reverse();

                if (validSheets.length > 0) {
                    const latestEvent = validSheets[0];

                    // Format Date for Display
                    try {
                        const [year, month, day] = latestEvent.split('_');
                        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        setLatestEventDate(dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                    } catch { 
                        setLatestEventDate(latestEvent); 
                    }

                    // 3. Fetch Actual Data to get Count
                    const attendees = await getAttendance(latestEvent);
                    setAttendedCount(attendees.length);
                } else {
                    setAttendedCount(0);
                    setLatestEventDate("No Events");
                }
            } catch (e) {
                console.error("Error fetching attendance:", e);
                setAttendedCount(0);
            }
        };

        fetchAttendance();
    }, []);

    // Update Attendance Chart when count or total users changes
    useEffect(() => {
        if (attendedCount !== null && stats) {
            const absent = Math.max(0, stats.totalUsers - attendedCount);
            setAttendanceData([
                { name: 'Attended', value: attendedCount, color: '#4ade80' },
                { name: 'Missed', value: absent, color: '#f87171' },
            ]);
        }
    }, [attendedCount, stats]);

    // --- 4. System Health Check (Latency) ---
    useEffect(() => {
        const checkHealth = async () => {
             const start = Date.now();
             try {
                 // Ping the server to check connectivity and speed
                 await fetch('/', { method: 'HEAD', cache: 'no-store' }); 
                 const latency = Date.now() - start;
                 
                 setStats(prev => ({ 
                     ...prev!, 
                     serverUptime: `Online (${latency}ms)`
                 }));
             } catch (e) {
                 setStats(prev => ({ 
                     ...prev!, 
                     serverUptime: "Offline" 
                 }));
             }
        };
        
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);


    const displayStats: OverviewStats = stats || { totalUsers: 0, totalPosts: 0, pendingPosts: 0, serverUptime: "Loading..." };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 text-gray-400">
                <Loader2 className="h-6 w-6 mr-3 animate-spin text-indigo-400" /> Fetching Dashboard Data...
            </div>
        );
    }

    return (
        <motion.div
            key="overview"
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
            exit={{ opacity: 0, y: -15 }}
            initial={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.4 }}
        >

            {/* 1. Stats Cards: Dynamic Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        title: "Total Users",
                        stat: displayStats.totalUsers.toLocaleString(),
                        desc: "Registered Accounts",
                        icon: Users,
                        color: 'text-indigo-300'
                    },
                    {
                        title: "Total Posts",
                        stat: displayStats.totalPosts.toLocaleString(),
                        desc: `${displayStats.pendingPosts} drafts pending`,
                        icon: Upload,
                        color: 'text-cyan-300'
                    },
                    {
                        title: "Server Uptime",
                        stat: displayStats.serverUptime.split(' ')[0],
                        desc: `Last checked: ${displayStats.serverUptime.split('(')[1]?.replace(')', '') || 'N/A'}`,
                        icon: Server,
                        color: 'text-green-300'
                    },
                ].map((card, i) => (
                    <Card key={i} className={GLASSY_CARD_CLASS} asChild>
                        <motion.div whileHover={{ scale: 1.02 }}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xl font-semibold text-gray-200">{card.title}</CardTitle>
                                <card.icon size={24} className={card.color} />
                            </CardHeader>
                            <CardContent>
                                <p className={`text-5xl font-extrabold mt-2 ${card.color}`}>{card.stat}</p>
                                <p className="text-sm text-gray-400 mt-1">{card.desc}</p>
                            </CardContent>
                        </motion.div>
                    </Card>
                ))}
            </div>

            {/* 2. Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Post Analytics (Line Chart) - DYNAMIC */}
                <Card className={GLASSY_CARD_CLASS}>
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-200">Post Analytics (Monthly Trend)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full p-0">
                        {monthlyPostData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyPostData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                    <XAxis dataKey="monthYear" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                                    <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} domain={[0, 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", color: "#fff" }}
                                        itemStyle={{ color: "#fff" }}
                                        labelStyle={{ color: "#9ca3af" }}
                                        formatter={(value, name) => [`${value} posts`, '']}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="posts" name="Posts" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8 }} dot={{ fill: '#8b5cf6', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-gray-500 pt-12">No posts with timestamps found for monthly trend.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Attendance Distribution (Pie Chart) - REAL DATA */}
                <Card className={GLASSY_CARD_CLASS}>
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-200">
                            Attendance Status <span className="text-sm font-normal text-gray-400 block sm:inline sm:ml-2">({latestEventDate || "Loading event..."})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full p-2 flex justify-center items-center">
                        {attendanceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={attendanceData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {attendanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#f8fafc", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)" }}
                                        itemStyle={{ color: "#fff", fontWeight: 600 }}
                                        formatter={(value: number) => [`${value} Students`, '']}
                                        separator=""
                                    />
                                    <Legend
                                        verticalAlign="middle"
                                        align="right"
                                        layout="vertical"
                                        iconType="circle"
                                        iconSize={10}
                                        formatter={(value) => <span className="text-gray-300 text-sm ml-2">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center text-gray-500">No attendance data found for the latest event.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}
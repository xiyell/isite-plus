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
import { collection, getDocs, query, Timestamp } from "firebase/firestore";

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
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [monthlyPostData, setMonthlyPostData] = useState<MonthlyData[]>([]);
    const [loading, setLoading] = useState(true);

    const formatTimestampToMonthYear = (timestamp: Timestamp): string => {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const aggregatePostsByMonth = (communitySnapshot: any) => {
        const counts: { [key: string]: number } = {};
        const postRecords: { timestamp: Timestamp, title: string }[] = [];

        // 1. Gather all posts and their timestamps
        communitySnapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            // Assuming primary posts have a 'title' field
            if (data.title && data.createdAt instanceof Timestamp) {
                postRecords.push({ timestamp: data.createdAt, title: data.title });
            }
        });

        // 2. Sort by date (oldest first for the line chart)
        postRecords.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);

        // 3. Aggregate posts by Month/Year string
        postRecords.forEach(record => {
            const monthYear = formatTimestampToMonthYear(record.timestamp);
            counts[monthYear] = (counts[monthYear] || 0) + 1;
        });

        // 4. Convert aggregated map to the array format Recharts expects
        const aggregatedData: MonthlyData[] = Object.keys(counts).map(monthYear => ({
            monthYear: monthYear,
            posts: counts[monthYear],
        }));

        setMonthlyPostData(aggregatedData);
    };

    const fetchOverviewStats = useCallback(async () => {
        setLoading(true);
        try {
            // --- 1. Fetch Users ---
            const usersSnapshot = await getDocs(collection(db, "users"));
            const totalUsers = usersSnapshot.size;

            // --- 2. Fetch Community Activity ---
            const communityQuery = collection(db, "community");
            const communitySnapshot = await getDocs(communityQuery);

            let totalPosts = 0;
            let pendingPosts = 0;

            communitySnapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.title) {
                    totalPosts++;
                    if (data.status === "pending") {
                        pendingPosts++;
                    }
                }
            });

            // --- 3. Aggregate Monthly Data ---
            aggregatePostsByMonth(communitySnapshot);

            // --- 4. Simulate External Data ---
            const serverUptime = "99.9% (6d ago)";

            setStats({
                totalUsers,
                totalPosts,
                pendingPosts,
                serverUptime,
            });

        } catch (error) {
            console.error("Error fetching overview stats:", error);
            setStats({ totalUsers: 0, totalPosts: 0, pendingPosts: 0, serverUptime: "Error" });
            setMonthlyPostData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverviewStats();
    }, [fetchOverviewStats]);


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

                {/* Platform Distribution (Pie Chart) - MOCK */}
                <Card className={GLASSY_CARD_CLASS}>
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-gray-200">Platform Distribution (Mock)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full p-2 flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={platformData}
                                    cx="40%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {platformData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#f8fafc", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)" }}
                                    itemStyle={{ color: "#fff", fontWeight: 600 }}
                                    formatter={(value: number) => [`${value} Posts`, '']}
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
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}
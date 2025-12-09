'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Zap, Trash2, Edit, Search, XCircle, CheckCircle, AlertTriangle, Calendar, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dispatch, SetStateAction } from 'react';

// --- Types (Matched with Parent) ---
type SeverityLevel = "low" | "medium" | "high";
interface LogEntry {
    id: string;
    category: "posts" | "users" | "system";
    action: string;
    severity: SeverityLevel;
    message: string;
    time: string;
    timestamp: number;
}

interface ActivityLogsProps {
    logs: LogEntry[];
    filter: string;
    setFilter: Dispatch<SetStateAction<string>>;
    sortOrder: string;
    setSortOrder: Dispatch<SetStateAction<string>>;
}

// --- Helper Functions ---
const getActionConfig = (category: string, severity: SeverityLevel) => {
    switch (category) {
        case 'posts':
            return { Icon: Edit, color: 'text-blue-400 bg-blue-400/10' };
        case 'users':
            return { Icon: User, color: 'text-green-400 bg-green-400/10' };
        case 'system':
            return { Icon: Zap, color: 'text-yellow-400 bg-yellow-400/10' };
        default:
            return { Icon: Activity, color: 'text-gray-400 bg-gray-400/10' };
    }
};

const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
        case 'high': return "bg-red-500/20 text-red-500 border-red-500/50";
        case 'medium': return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
        case 'low': return "bg-green-500/20 text-green-500 border-green-500/50";
        default: return "bg-gray-500/20 text-gray-500";
    }
}


// --- Main Dashboard Component ---

export default function ActivityLogDashboard({ logs, filter, setFilter, sortOrder, setSortOrder }: ActivityLogsProps) {

    // --- Helper Component for Table Rows ---
    const LogRow = ({ log }: { log: LogEntry }) => {
        const { Icon, color } = getActionConfig(log.category, log.severity);

        return (
            <TableRow className="hover:bg-white/5 border-b border-white/10">
                {/* Time & User (using 'time' as string representation) */}
                <TableCell className="w-[180px]">
                    <div className="flex items-center space-x-2 font-medium text-gray-300">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{log.time}</span>
                    </div>
                </TableCell>

                {/* Category/Icon */}
                <TableCell className="w-[150px]">
                    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${color}`}>
                        <Icon className="h-4 w-4" />
                        <span className="capitalize text-sm font-medium">{log.category}</span>
                    </div>
                </TableCell>

                {/* Severity */}
                <TableCell className="w-[100px]">
                    <Badge variant="outline" className={`capitalize ${getSeverityBadge(log.severity)}`}>
                        {log.severity}
                    </Badge>
                </TableCell>

                {/* Action */}
                <TableCell className="w-[150px]">
                    <span className="font-semibold text-gray-200">{log.action}</span>
                </TableCell>

                {/* Details */}
                <TableCell>
                    <p className="text-sm text-gray-400">{log.message}</p>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <div className="space-y-6">
            {/* Control/Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search logs..."
                            className="pl-10 bg-black/20 border-white/10 text-gray-200 focus:ring-indigo-500"
                            disabled // Search logic implemented in parent or local? Parent only has 'filter' for category.
                        />
                    </div>

                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px] bg-black/20 border-white/10 text-gray-200">
                            <SelectValue placeholder="Filter Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/10 text-gray-200">
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="posts">Posts</SelectItem>
                            <SelectItem value="users">Users</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-[180px] bg-black/20 border-white/10 text-gray-200">
                        <SelectValue placeholder="Sort Order" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10 text-gray-200">
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Activity Log Table */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-lg shadow-xl">
                <CardHeader>
                    <CardTitle className="text-gray-100 flex items-center gap-2">
                        <Activity className="text-indigo-400" />
                        System Activity Logs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-white/10">
                                    <TableHead className="text-gray-400">Timestamp</TableHead>
                                    <TableHead className="text-gray-400">Category</TableHead>
                                    <TableHead className="text-gray-400">Severity</TableHead>
                                    <TableHead className="text-gray-400">Action</TableHead>
                                    <TableHead className="text-gray-400">Message</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length > 0 ? (
                                    logs.map(log => <LogRow key={log.id} log={log} />)
                                ) : (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={5} className="text-center text-gray-500 py-10 h-32">
                                            No activity logs found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
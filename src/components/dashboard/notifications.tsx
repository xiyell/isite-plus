'use client';

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, AlertTriangle, XCircle, Info, Trash2, Loader2, Zap } from "lucide-react";


// --- Data Structure (Unchanged) ---
interface Notification {
    id: string; // Document ID
    type: 'error' | 'warning' | 'info' | 'success';
    title: string;
    description: string;
    timestamp: string; // Firestore Timestamps can be handled as strings for simplicity here
    isResolved: boolean;
}

// --- Placeholder/Mock Utility Data (Unchanged) ---
const initialMockNotifications: Notification[] = [
    { id: 'n001', type: 'error', title: 'Critical API Failure', description: 'User authentication service (Auth-01) is returning 500 errors.', timestamp: '2025-12-09 14:00', isResolved: false },
    { id: 'n002', type: 'warning', title: 'Low Disk Space', description: 'Database server DB-03 is at 95% capacity.', timestamp: '2025-12-09 13:30', isResolved: false },
    { id: 'n003', type: 'info', title: 'New Feature Deployed', description: 'The new analytics reporting tool is now live.', timestamp: '2025-12-09 10:15', isResolved: true },
    { id: 'n004', type: 'success', title: 'System Update Complete', description: 'All servers have been successfully updated to v2.3.1.', timestamp: '2025-12-08 09:00', isResolved: true },
];

// --- Helper Functions and Components (RETAINED) ---

const getAlertConfig = (type: Notification['type']) => {
    switch (type) {
        case 'error':
            return { Icon: XCircle, variant: 'destructive' as const, color: 'text-red-400' };
        case 'warning':
            return { Icon: AlertTriangle, variant: 'default' as const, color: 'text-yellow-400' };
        case 'success':
            return { Icon: CheckCircle, variant: 'default' as const, color: 'text-green-400' };
        case 'info':
        default:
            return { Icon: Info, variant: 'default' as const, color: 'text-blue-400' };
    }
};


// --- Main Dashboard Component ---

export default function NotificationsDashboard() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Placeholder for Fetching Data (Simulates Firestore Snapshot Listener)
    useEffect(() => {
        setIsLoading(true);

        // Simulate API/Firebase fetch delay
        const timer = setTimeout(() => {
            // Sort to show the newest notifications first (simulates common Firebase query)
            const sortedNotifications = initialMockNotifications.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setNotifications(sortedNotifications);
            setIsLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    // 2. Placeholder for Updating/Resolving a Notification
    const handleResolve = useCallback(async (id: string) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, isResolved: true } : n
        ));
        console.log(`Simulating update for notification ${id}...`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }, []);

    // 3. Placeholder for Clearing Resolved Notifications
    const handleClearResolved = async () => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 700)); // Simulate cleanup delay
        setNotifications(prev => prev.filter(n => !n.isResolved));
        setIsLoading(false);
        console.log("Resolved notifications cleared.");
    };

    // --- Derived State (for quick access) ---
    const openErrors = notifications.filter(n => n.type === 'error' && !n.isResolved);
    const openWarnings = notifications.filter(n => n.type === 'warning' && !n.isResolved);
    const totalOpen = openErrors.length + openWarnings.length;
    const recentFeed = notifications.slice(0, 10);

    // Component for the main feed rows (Adapted for glass text colors)
    const NotificationRow = ({ notification }: { notification: Notification }) => {
        const { Icon, color } = getAlertConfig(notification.type);

        return (
            // Apply subtle hover and resolved styling. Background must remain low opacity.
            <TableRow className={
                notification.isResolved
                    ? 'text-gray-500 bg-black/10 border-white/10'
                    : 'hover:bg-white/10 text-white border-white/10'
            }>
                <TableCell className="w-[100px]"><Icon className={`h-4 w-4 ${color}`} /></TableCell>
                <TableCell className="w-[120px]">
                    {notification.isResolved ? (
                        <Badge variant="outline" className="text-gray-500 border-white/20 bg-black/10">Resolved</Badge>
                    ) : (
                        <Badge className={notification.type === 'error' ? 'bg-red-600/70 text-white' : 'bg-yellow-600/70 text-white'}>
                            {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                        </Badge>
                    )}
                </TableCell>
                <TableCell className="font-medium">
                    <div className={notification.isResolved ? 'line-through text-gray-500' : 'text-white'}>
                        {notification.title}
                    </div>
                    <p className="text-sm text-gray-400">{notification.description}</p>
                </TableCell>
                <TableCell className="text-right text-sm text-gray-500 w-[150px]">
                    {notification.timestamp}
                </TableCell>
                <TableCell className="text-right w-[80px]">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-green-400"
                        disabled={notification.isResolved}
                        onClick={() => handleResolve(notification.id)}
                    >
                        <CheckCircle className="h-4 w-4" />
                    </Button>
                </TableCell>
            </TableRow>
        );
    };

    // Apply primary glassy container style (assuming it wraps the whole dashboard)
    return (
        <div className="p-8 space-y-8 min-h-screen text-white bg-black/10 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-xl">

            {/* Dashboard Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold tracking-tight">System Notification Dashboard</h1>
                <Button
                    variant="outline"
                    onClick={handleClearResolved}
                    disabled={isLoading || notifications.filter(n => n.isResolved).length === 0}
                    // Glassy Button style
                    className="text-white border-white/20 hover:bg-white/15"
                >
                    <Trash2 className="h-4 w-4 mr-2" /> Clear Resolved
                </Button>
            </div>

            {/* Main Grid: Status Cards and Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN (COL SPAN 2: Notification Feed) */}
                <div className="lg:col-span-2">
                    <Card className="bg-black/10 backdrop-blur-lg border border-white/10 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-white">Recent Activity Feed</CardTitle>
                            <CardDescription className="text-gray-300">A chronological log of system events and alerts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                                    <span className="ml-2 text-gray-400">Loading notifications...</span>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-black/30 border-white/20 hover:bg-black/30">
                                            <TableHead className="w-[100px] text-white">Type</TableHead>
                                            <TableHead className="w-[120px] text-white">Status</TableHead>
                                            <TableHead className="text-white">Details</TableHead>
                                            <TableHead className="text-right w-[150px] text-white">Time</TableHead>
                                            <TableHead className="text-right w-[80px] text-white">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentFeed.map(notification => (
                                            <NotificationRow key={notification.id} notification={notification} />
                                        ))}
                                        {recentFeed.length === 0 && (
                                            <TableRow className="border-white/10">
                                                <TableCell colSpan={5} className="text-center text-gray-500 py-4">
                                                    No recent notifications found. All clear!
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN (COL SPAN 1: Summary and Actionable Alerts) */}
                <div className="space-y-6">

                    {/* Summary Card (Hardcoded values retained, styles applied) */}
                    <Card className="bg-black/10 backdrop-blur-lg border-t-4 border-t-blue-500 border border-white/10 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-200">
                                Total Open Alerts
                            </CardTitle>
                            <AlertTriangle className="h-4 w-4 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{totalOpen}</div>
                            <p className="text-xs text-gray-400">
                                <span className="text-red-400 font-medium">{openErrors.length} Errors</span> | <span className="text-yellow-400 font-medium">{openWarnings.length} Warnings</span>
                            </p>
                        </CardContent>
                    </Card>

                    {/* Critical Alert Banner (Glass style applied to Alert) */}
                    {openErrors.length > 0 && (
                        <Alert
                            variant="destructive"
                            className="border-l-4 border-red-500 bg-red-900/20 backdrop-blur-md border-red-400/50"
                        >
                            <XCircle className="h-4 w-4 text-red-400" />
                            <AlertTitle className="text-white">CRITICAL ERRORS PENDING!</AlertTitle>
                            <AlertDescription className="text-gray-300">
                                You have **{openErrors.length}** critical system errors that require immediate attention.
                            </AlertDescription>
                            <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700 text-white">View Errors</Button>
                        </Alert>
                    )}

                    {/* Important Details: Best Practices and Tips */}
                    <Card className="bg-black/10 backdrop-blur-lg border border-white/10 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg text-white">Notification Best Practices</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside text-sm space-y-2 text-gray-400">
                                <li>**Actionable Language:** Messages should tell the user *what to do* next.</li>
                                <li>**Color Coding:** Red for Error/Critical, Yellow/Orange for Warning, Blue for Info, Green for Success.</li>
                                <li>**Time Stamps:** Always include a time of occurrence for debugging.</li>
                                <li>**Severity Filters:** Allow users to filter by Critical, Warning, and Info for triage.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
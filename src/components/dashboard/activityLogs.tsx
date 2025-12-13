"use client";

import { useEffect, useState } from "react";
import { getLogs, LogEntry, SeverityLevel } from "@/actions/logs";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Zap, Edit, Search, Calendar, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ---------- Helpers ---------- */

const getActionConfig = (category: string) => {
  switch (category) {
    case "posts":
      return { Icon: Edit, color: "text-blue-400 bg-blue-400/10" };
    case "users":
      return { Icon: User, color: "text-green-400 bg-green-400/10" };
    case "system":
      return { Icon: Zap, color: "text-yellow-400 bg-yellow-400/10" };
    default:
      return { Icon: Activity, color: "text-gray-400 bg-gray-400/10" };
  }
};

const getSeverityBadge = (severity: SeverityLevel) => {
  switch (severity) {
    case "high":
      return "bg-red-500/20 text-red-500 border-red-500/50";
    case "medium":
      return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
    case "low":
      return "bg-green-500/20 text-green-500 border-green-500/50";
  }
};

/* ---------- Component ---------- */

export default function ActivityLogDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    async function fetchLogs() {
      const data = await getLogs();
      setLogs(data);
    }

    fetchLogs();
  }, []);

  /* ---------- Filter + Sort ---------- */

  const filteredLogs =
    filter === "all"
      ? logs
      : logs.filter((log) => log.category === filter);

  const sortedLogs = [...filteredLogs].sort((a, b) =>
    sortOrder === "newest"
      ? b.timestamp - a.timestamp
      : a.timestamp - b.timestamp
  );

  /* ---------- Row ---------- */

  const LogRow = ({ log }: { log: LogEntry }) => {
    const { Icon, color } = getActionConfig(log.category);

    return (
      <TableRow className="hover:bg-white/5 border-b border-white/10">
        <TableCell className="w-[180px]">
          <div className="flex items-center space-x-2 text-gray-300">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{log.time}</span>
          </div>
        </TableCell>

        <TableCell className="w-[150px]">
          <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${color}`}>
            <Icon className="h-4 w-4" />
            <span className="capitalize text-sm">{log.category}</span>
          </div>
        </TableCell>

        <TableCell className="w-[100px]">
          <Badge variant="outline" className={`capitalize ${getSeverityBadge(log.severity)}`}>
            {log.severity}
          </Badge>
        </TableCell>

        <TableCell className="w-[150px] text-gray-200 font-semibold">
          {log.action}
        </TableCell>

        <TableCell className="text-gray-400 text-sm">
          {log.message}
        </TableCell>
      </TableRow>
    );
  };

  /* ---------- UI ---------- */

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input disabled placeholder="Search logs..." className="pl-10 bg-black/20 border-white/10" />
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] bg-black/20 border-white/10">
              <SelectValue placeholder="Filter Category" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="posts">Posts</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-[180px] bg-black/20 border-white/10">
            <SelectValue placeholder="Sort Order" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900">
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex gap-2 text-gray-100">
            <Activity className="text-indigo-400" />
            System Activity Logs
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedLogs.length ? (
                sortedLogs.map((log) => <LogRow key={log.id} log={log} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-10">
                    No activity logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
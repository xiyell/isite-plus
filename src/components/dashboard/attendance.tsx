'use client';

import { useState, useEffect } from 'react';
// ✅ CORRECTED CASE: Shadcn UI Component Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CalendarCheck, CalendarX, Users, Loader2, BarChart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// --- Data Structures (Unchanged) ---
interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Tardy';
  timeIn: string;
}

interface SummaryData {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  tardyCount: number;
}

// --- Placeholder/Mock Data (Unchanged) ---
const mockAttendanceRecords: AttendanceRecord[] = [
  { id: 'r001', studentId: 'S1001', studentName: 'Alice Johnson', date: '2025-12-09', status: 'Present', timeIn: '08:00 AM' },
  { id: 'r002', studentId: 'S1002', studentName: 'Bob Smith', date: '2025-12-09', status: 'Tardy', timeIn: '08:15 AM' },
  { id: 'r003', studentId: 'S1003', studentName: 'Charlie Davis', date: '2025-12-09', status: 'Absent', timeIn: 'N/A' },
  { id: 'r004', studentId: 'S1004', studentName: 'Diana Prince', date: '2025-12-09', status: 'Present', timeIn: '07:55 AM' },
  { id: 'r005', studentId: 'S1005', studentName: 'Ethan Hunt', date: '2025-12-09', status: 'Present', timeIn: '08:05 AM' },
];

const mockSummary: SummaryData = {
  totalStudents: 50,
  presentCount: 42,
  absentCount: 5,
  tardyCount: 3,
};

// --- Main Dashboard Component ---

export default function AttendanceDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData>(mockSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Data Fetch Simulation (Unchanged)
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setRecords(mockAttendanceRecords);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // 2. Sheet Upload Handler (Unchanged)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    console.log(`Simulating upload of file: ${file.name}`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsUploading(false);
    alert(`File "${file.name}" processed and data updated!`);
  };

  const presentPercentage = Math.round((summary.presentCount / summary.totalStudents) * 100);

  // Set the overall container to be the primary glass layer: ADJUSTED PADDING FOR MOBILE
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 min-h-screen text-white bg-black/10 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-xl">

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Attendance Tracking</h1>
      <CardDescription className="text-base md:text-lg text-gray-300">Monitoring attendance records for **{new Date().toDateString()}**</CardDescription>

      <Separator className="bg-white/20" />

      {/* 3. Summary Cards: ADJUSTED GRID LAYOUT (1 or 2 columns on mobile, 4 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">

        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Present Students</CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-white font-bold">{summary.presentCount} / {summary.totalStudents}</div>
            <p className="text-xs text-gray-400">{presentPercentage}% Attendance Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Absent Today</CardTitle>
            <CalendarX className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-white font-bold">{summary.absentCount}</div>
            <p className="text-xs text-gray-400">Requires follow-up</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Tardy Students</CardTitle>
            <Users className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-white font-bold">{summary.tardyCount}</div>
            <p className="text-xs text-gray-400">Late arrivals</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Progress</CardTitle>
            <BarChart className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-white font-bold mb-2">Completion</div>
            <Progress value={presentPercentage} className="h-2 bg-white/20 [&>div]:bg-indigo-500" />
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-white/20" />

      {/* 4. Data Visualization (Graph Placeholder) */}
      <Card className="bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-200">Attendance Trend Chart</CardTitle>
          <CardDescription className="text-gray-400">Daily attendance over the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 md:h-64 bg-black/20 rounded-lg border border-dashed border-white/20">
            {/* Placeholder for a Chart (e.g., Recharts, Nivo) */}
            <p className="text-gray-400 text-center p-4">


              [Image of Bar chart showing student attendance trends]
              - **Present vs. Absent by Student ID**
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-white/20" />

      {/* 5. Sheet Integration & Data Table */}
      <div className="space-y-4">
        {/* Header and Upload Button: ADJUSTED FOR MOBILE WRAPPING */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <CardTitle className="text-gray-200">Attendance Log</CardTitle>

          {/* File Upload Button: WIDER ON MOBILE (w-full) */}
          <label htmlFor="sheet-upload" className="w-full sm:w-auto">
            <Button
              disabled={isUploading}
              className="bg-indigo-600/70 text-white hover:bg-indigo-600/90 border border-indigo-500/50 w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing Sheet...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Attendance Sheet
                </>
              )}
            </Button>
          </label>
          {/* Hidden Input for file selection */}
          <input
            id="sheet-upload"
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </div>

        {/* Table: WRAPPED IN OVERFLOW-X-AUTO FOR MOBILE SCROLLING */}
        <Card className="overflow-x-auto bg-black/10 backdrop-blur-lg border border-white/10 shadow-lg">
          <Table className="min-w-full md:min-w-0">
            <TableHeader>
              <TableRow className="bg-black/20 border-white/20 hover:bg-black/20">
                <TableHead className="w-[120px] text-gray-300 whitespace-nowrap">Student ID</TableHead>
                <TableHead className="text-gray-300 whitespace-nowrap">Student Name</TableHead>
                <TableHead className="text-gray-300 whitespace-nowrap">Time In</TableHead>
                <TableHead className="text-right w-[150px] text-gray-300 whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="text-center text-gray-400 py-10">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin inline" /> Loading records...
                  </TableCell>
                </TableRow>
              ) : (
                records.map(record => (
                  <TableRow
                    key={record.id}
                    className={`border-white/10 hover:bg-white/10 ${record.status === 'Absent' ? 'bg-red-500/10 hover:bg-red-500/20' : ''}`}
                  >
                    <TableCell className="font-medium text-white whitespace-nowrap">{record.studentId}</TableCell>
                    <TableCell className="text-gray-200 whitespace-nowrap">{record.studentName}</TableCell>
                    <TableCell className="text-gray-300 whitespace-nowrap">{record.timeIn}</TableCell>
                    <TableCell className={`text-right font-semibold whitespace-nowrap ${record.status === 'Present' ? 'text-green-400' :
                      record.status === 'Tardy' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                      {record.status}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
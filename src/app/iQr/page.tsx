"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
// Import Lucide Icons
import { AlertCircle, Download, RotateCw, Loader2 } from "lucide-react";
// Import QRCode library
import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";

// --- SHADCN/UI IMPORTS ---
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// Define the shape of user data
interface UserData {
  name: string;
  idNumber: string;
  yearLevel: string;
  section: string;
  uid: string;
}

// --- CONSTANTS ---
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const TOTAL_SECONDS = 300; // 5 minutes in seconds
const QR_SIZE = 300;

// Helper function to format seconds into MM:SS
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// --- API/FIREBASE MOCK FUNCTION ---
const fetchUserData = async (userId: string): Promise<UserData | null> => {
  console.log(`Fetching data for user: ${userId}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        uid: "firebase-user-id-123",
        name: "Ciel Angelo Q.",
        idNumber: "2025-12345",
        yearLevel: "4th Year",
        section: "BSIT-A",
      });
    }, 1200);
  });
};


const IQR = () => {
  const [qrValue, setQrValue] = useState<string>("");
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_SECONDS);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDataError, setIsDataError] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 1. Initial Data Fetch
  useEffect(() => {
    const loadInitialData = async () => {
      const userId = "mock-user-id";

      try {
        const data = await fetchUserData(userId);
        if (data) {
          setUserData(data);
        } else {
          setIsDataError(true);
          toast.error("Failed to load user profile. Please log in.");
        }
      } catch (error) {
        console.error("Firebase/Data Fetch Error:", error);
        setIsDataError(true);
        toast.error("An error occurred while fetching data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  /**
   * Generates the encoded QR value based on user data and current timestamp.
   */
  const generateQrValue = useCallback((data: UserData, ts: number) => {
    const generatedAt = new Date(ts).toISOString();
    const expiresAt = new Date(ts + REFRESH_INTERVAL_MS).toISOString();

    const payload = {
      uid: data.uid,
      idNumber: data.idNumber,
      generatedAt,
      expiresAt,
      timestamp: ts,
    };

    try {
      const jsonString = JSON.stringify(payload);
      const encoded = btoa(
        unescape(encodeURIComponent(jsonString)),
      );
      return encoded;
    } catch (err) {
      console.error("QR Encoding Error:", err);
      toast.error("Error generating QR code payload.");
      return "";
    }
  }, []);

  // 2. QR Value Generation Effect
  useEffect(() => {
    if (userData) {
      setQrValue(generateQrValue(userData, timestamp));
    } else {
      setQrValue("");
    }
    setIsRefreshing(false);
  }, [timestamp, userData, generateQrValue]);

  // 3. Countdown Timer and Auto-Refresh Logic
  useEffect(() => {
    setTimeLeft(TOTAL_SECONDS);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimestamp(Date.now());
          toast("QR Code refreshed automatically!", { icon: '🔄' });
          return TOTAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timestamp]);

  // Manual Refresh Handler
  const handleManualRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setTimestamp(Date.now());
    toast("QR Code manually refreshed!", { icon: '✅' });
  }, [isRefreshing]);

  // Progress bar percentage calculation
  const progressPercent = useMemo(
    () => ((TOTAL_SECONDS - timeLeft) / TOTAL_SECONDS) * 100,
    [timeLeft],
  );

  // Download QR as PNG
  const handleDownload = useCallback(() => {
    const canvas = document.getElementById(
      "qr-code-canvas",
    ) as HTMLCanvasElement | null;

    if (!canvas) {
      toast.error("QR Canvas element not found for download.");
      return;
    }
    try {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `iQR_Code_${userData?.idNumber}_${Date.now()}.png`;
      link.click();
      toast.success("QR Code downloaded successfully!");
    } catch (error) {
      console.error("Download Error:", error);
      toast.error("Failed to download QR code.");
    }

  }, [userData?.idNumber]);

  // --- Render Functions ---

  // Loading State
  if (isLoading) {
    return (
      // Set the overall container to transparent, relying on parent styling.
      <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
        <Card className="w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20">
          <CardHeader className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400 mb-4" />
            <Skeleton className="mx-auto mb-2 h-6 w-3/5 bg-white/20" />
            <Skeleton className="mx-auto h-4 w-4/5 bg-white/20" />
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Skeleton className={`h-[${QR_SIZE}px] w-[${QR_SIZE}px] mb-6 bg-white/20`} />

            {/* Purplish Loading Progress Bar */}
            <Progress
              value={50}
              className="mt-5 h-3 w-full bg-purple-900/50" // Thicker and darker background
              indicatorClassName="bg-gradient-to-r from-purple-400 to-indigo-500" // Gradient for indicator
              style={{
                // This is the purplish glow effect
                boxShadow: '0 0 10px #A855F7, 0 0 5px #C084FC',
              }}
            />

            <div className="mt-6 w-full space-y-2">
              <Skeleton className="h-4 w-4/5 bg-white/20" />
              <Skeleton className="h-4 w-3/5 bg-white/20" />
              <Skeleton className="h-4 w-1/2 bg-white/20" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="flex w-full gap-2">
              <Skeleton className="h-10 flex-grow bg-white/20" />
              <Skeleton className="h-10 flex-grow bg-white/20" />
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error State
  if (isDataError || !userData) {
    return (
      // Set the overall container to transparent
      <div className="flex min-h-screen items-center justify-center p-6 bg-transparent">
        <Alert variant="destructive" className="w-full max-w-lg bg-red-900/20 border-red-500/50 backdrop-blur-md text-red-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            Failed to load user data. Please ensure you are logged in correctly and try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main Render
  return (
    // Base container is now transparent. If this component is placed inside an element 
    // with no background, it will blend seamlessly.
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-transparent">
      <Card
        // Glassmorphism styling remains for the card itself
        className="w-full max-w-lg backdrop-blur-xl transition-all duration-300 shadow-2xl 
                   bg-white/10 border border-white/20 text-white"
      >
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-extrabold text-white">Your iQR Code</CardTitle>
          <CardDescription className="text-gray-300">
            Secure, expiring code. Automatically refreshes every {TOTAL_SECONDS / 60} minutes.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center">
          <div className={`text-xl font-bold mb-6 transition-colors duration-500 ${timeLeft < 60 ? 'text-red-400' : 'text-purple-300'}`}>
            Next Refresh: {formatTime(timeLeft)}
          </div>

          {/* QR Code Display Container - Solid white background for scanning */}
          <div
            className="p-4 shadow-2xl rounded-xl border border-gray-700/50 bg-white"
            style={{
              width: `${QR_SIZE + 32}px`,
              height: `${QR_SIZE + 32}px`,
            }}
          >
            <div className="flex h-full w-full items-center justify-center">
              {qrValue ? (
                <QRCodeCanvas
                  key={qrValue}
                  includeMargin={false}
                  bgColor="#FFFFFF" // Explicitly white background
                  fgColor="#000000"
                  id="qr-code-canvas"
                  size={QR_SIZE}
                  value={qrValue}
                  className="rounded-lg"
                />
              ) : (
                <p className="flex h-[300px] w-[300px] items-center justify-center text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  Generating Code...
                </p>
              )}
            </div>
          </div>

          {/* Active Progress Bar with Purplish Glow */}
          <Progress
            value={progressPercent}
            className="mt-8 h-3 w-full bg-purple-900/50" // Thicker background for visibility
            indicatorClassName="bg-gradient-to-r from-purple-400 to-indigo-500" // Gradient for indicator
            style={{
              boxShadow: '0 0 10px #A855F7, 0 0 5px #C084FC', // Purplish glow
            }}
          />

          {/* User Details */}
          <div className="mt-8 w-full space-y-2 text-left text-base text-gray-200">
            <p>
              <span className="font-bold text-white">Name:</span> {userData.name}
            </p>
            <p>
              <span className="font-bold text-white">ID Number:</span> {userData.idNumber}
            </p>
            <p>
              <span className="font-bold text-white">Class:</span>{" "}
              <span className="font-medium text-purple-300">
                {userData.yearLevel} — {userData.section}
              </span>
            </p>
            <p className="mt-4 text-xs text-gray-400">
              <span className="font-medium">Last Generated:</span>{" "}
              {new Date(timestamp).toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "medium",
                timeStyle: "medium",
              })}
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <div className="flex w-full gap-3">
            <Button
              onClick={handleDownload}
              className="flex-grow bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              variant="default"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PNG
            </Button>
            <Button
              onClick={handleManualRefresh}
              className="flex-grow bg-yellow-600 hover:bg-yellow-700 transition-colors duration-200"
              variant="secondary"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="mr-2 h-4 w-4" />
              )}
              {isRefreshing ? 'Refreshing...' : 'Manual Refresh'}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Warning Alert - Glassy style */}
      <Alert
        className="mt-6 w-full max-w-lg bg-yellow-500/35 backdrop-blur-sm border border-yellow-500/50"
        variant="default"
      >
        <AlertCircle className="h-4 w-4 text-white-500 " />
        <AlertTitle className="text-yellow-400">Important</AlertTitle>
        <AlertDescription className="text-white">
          ⚠️ Make sure your **Year and Section** details are correct. Incorrect information may invalidate your attendance.{" "}
          <Link
            className="font-semibold text-purple-400 underline underline-offset-2 transition-colors hover:text-purple-300"
            href="/profile"
          >
            Modify your profile here.
          </Link>

        </AlertDescription>
      </Alert>
    </div>
  );
};

export default IQR;
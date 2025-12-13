"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { QRCodeCanvas } from "qrcode.react";
import { auth, db } from "@/services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function IQR() {
  const [qrValue, setQrValue] = useState("");
  const [timestamp, setTimestamp] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(300);
  const [userData, setUserData] = useState<any>(null);

  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const TOTAL_SECONDS = 300;

  // --------------------------------------------------------
  // Get current user data from Firestore
  // --------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setUserData({
            name: data.name || user.displayName || "Unnamed User",
            idNumber: data.studentId || "N/A",
            yearLevel: data.yearLevel || "N/A",
            section: data.section || "N/A",
          });
        } else {
          console.warn("No user document found in Firestore.");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------
  // Auto refresh QR every 5 minutes
  // --------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => setTimestamp(Date.now()), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------------
  // Countdown Timer
  // --------------------------------------------------------
  useEffect(() => {
    setTimeLeft(TOTAL_SECONDS);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimestamp(Date.now());
          return TOTAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timestamp]);

  // --------------------------------------------------------
  // Generate encoded QR value
  // --------------------------------------------------------
  useEffect(() => {
    if (!userData) return;

    const generatedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + REFRESH_INTERVAL).toISOString();
    const payload = { ...userData, generatedAt, expiresAt, timestamp };

    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      setQrValue(encoded);
    } catch (err) {
      console.error("QR Encoding Error:", err);
    }
  }, [timestamp, userData]);

  // --------------------------------------------------------
  // Format countdown display
  // --------------------------------------------------------
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --------------------------------------------------------
  // Progress bar percentage
  // --------------------------------------------------------
  const progressPercent = ((TOTAL_SECONDS - timeLeft) / TOTAL_SECONDS) * 100;

  // --------------------------------------------------------
  // Download QR as PNG (via ID instead of ref)
  // --------------------------------------------------------
  const handleDownload = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "iQR_Code.png";
    link.click();
  };

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------
  if (!userData)
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Loading user data...
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-transparent via-white/5 to-transparent text-white px-6">
      <motion.div className="p-6 sm:p-8 rounded-3xl shadow-lg bg-white/10 backdrop-blur-md border border-white/20 text-center w-full max-w-sm">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Your iQR Code</h1>

        <p className="text-sm text-gray-300 mb-3">
          Automatically refreshes every 5 minutes
        </p>

        <motion.div className="text-lg font-semibold text-yellow-400 mb-6">
          Refreshing in {formatTime(timeLeft)}
        </motion.div>

        {/* ✅ Subtle QR animation fix */}
        <div className="flex justify-center">
          <motion.div
            layout
            className="bg-white/10 p-4 rounded-xl shadow-md flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {qrValue ? (
              <QRCodeCanvas
                id="qr-code-canvas"
                key={qrValue}
                value={qrValue}
                size={220}
                includeMargin
                bgColor="#ffffff"
                fgColor="#000000"
                className="rounded-lg bg-white"
              />
            ) : (
              <p className="text-gray-300">Generating QR...</p>
            )}
          </motion.div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700/30 rounded-full h-2 mt-5 overflow-hidden">
          <motion.div
            className="h-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "linear", duration: 1 }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <div className="w-full sm:flex-1">
            <Button color="primary" onClick={handleDownload} className="w-full">
              Download
            </Button>
          </div>
          <div className="w-full sm:flex-1">
            <Button color="warning" onClick={() => setTimestamp(Date.now())} className="w-full">
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-6 text-gray-200 text-sm space-y-1">
          <p>
            <span className="font-semibold">Name:</span> {userData.name}
          </p>
          <p>
            <span className="font-semibold">ID:</span> {userData.idNumber}
          </p>
          <p>
            <span className="font-semibold">Year & Section:</span>{" "}
            {userData.yearLevel} — {userData.section}
          </p>
          <p>
            <span className="font-semibold">Generated:</span>{" "}
            {new Date(timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
          </p>
          <p className="text-gray-400 text-xs">
            Expires at:{" "}
            {new Date(timestamp + REFRESH_INTERVAL).toLocaleString("en-PH", {
              timeZone: "Asia/Manila",
            })}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 flex flex-col sm:flex-row items-center sm:justify-center gap-2 text-sm text-white/70 text-center sm:text-left px-4"
      >
        <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
        <p className="leading-relaxed">
          Make sure your <span className="text-white font-medium">Year and Section</span> are
          correct. Otherwise, your attendance may not be counted.{" "}
          <Link
            href="/profile"
            className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold underline underline-offset-2 transition-colors"
          >
            Modify here
          </Link>
          .
        </p>
      </motion.div>
    </div>
  );
}

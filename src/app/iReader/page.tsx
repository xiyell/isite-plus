"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useZxing } from "react-zxing";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

type QRData = {
  name: string;
  idNumber: string;
  yearLevel: string;
  section: string;
  generatedAt?: string;
  expiresAt?: string;
};

export default function IReader() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Auth Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          const role = userData?.role || "user";

          if (role === "admin" || role === "moderator") {
            setIsAuthorized(true);
          } else {
            router.push("/");
          }
        } catch (error) {
          console.error("Error checking role:", error);
          router.push("/");
        }
      } else {
        router.push("/");
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  const [decodedData, setDecodedData] = useState<QRData | null>(null);
  const [isCameraAllowed, setIsCameraAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSetupDone, setIsSetupDone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(false);

  const [sheetDate, setSheetDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // --------------------------------------------------------
  // Uses ZXing module to handle QR code scanning from the video stream
  // --------------------------------------------------------
  const { ref: zxingRef } = useZxing({
    onDecodeResult(result) {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const text = result.getText();
        // --------------------------------------------------------
        // Generated QR code data is expected to be in JSON format, either plain or base64-encoded.
        // But we will use Base64 encoding in the Final Output
        // --------------------------------------------------------
        let json: QRData | null = null;
        try {
          json = JSON.parse(atob(text)) as QRData; 
        } catch {
          try {
            json = JSON.parse(text) as QRData; 
          } catch (e) {
            throw new Error("QR content is not JSON or base64(JSON)");
          }
        }

        // --------------------------------------------------------
        //  Checks if the QR code is Expired or not by checking the current time and the value expiresAt in the QR code data
        // --------------------------------------------------------
        
        const now = new Date();
        const expiresAt = json.expiresAt ? new Date(json.expiresAt) : null;

        if (expiresAt && now > expiresAt) {
          showNotification("error", "❌ QR Code has expired.");
          console.warn("Expired QR:", json);
          setIsProcessing(false);
          return;
        }

        // --------------------------------------------------------
        // Avoids duplicate scans by checking if the Student Id has already been scanned by this device
        // --------------------------------------------------------
        const uniqueKey = `${json.idNumber}`;
        if (lastScanned.has(uniqueKey)) {
          showNotification("error", "⚠️ QR already scanned previously!");
          console.warn("Duplicate QR:", json);
          setIsProcessing(false);
          return;
        }

        setLastScanned((prev) => new Set([...prev, uniqueKey]));
        setDecodedData(json);

        // --------------------------------------------------------
        // Send the data to the backend API to record attendance
        // --------------------------------------------------------
        fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...json, sheetDate }),
        })
          .then(async (res) => {
            if (res.ok) {
              showNotification("success", `✅ ${json!.name} recorded successfully!`);
            } else {
              const err = await res.json().catch(() => ({}));
              showNotification("error", `❌ Failed: ${err.error || "Unknown error"}`);
            }
          })
          .catch((e) => {
            console.error("Network error posting attendance:", e);
            showNotification("error", "⚠️ Network error. Try again.");
          })
          .finally(() => {
            setTimeout(() => setIsProcessing(false), 1500);
          });
      } catch (e) {
        console.error("Invalid QR format", e);
        showNotification("error", "❌ Invalid QR format.");
        setIsProcessing(false);
      }
    },  // --------------------------------------------------------
        // Start/Stops scanning depending on Camera Permissions
        // --------------------------------------------------------
    paused: !isCameraAllowed,
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };
        // --------------------------------------------------------
        // Requests camera access from the user and handles errors
        // --------------------------------------------------------
  const requestCameraAccess = async () => {
    setError(null);
    setLoadingCamera(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Camera not supported. Use Chrome/Edge/Safari on HTTPS.";
      console.error(msg);
      setError(msg);
      setLoadingCamera(false);
      return;
    }

    try {
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });


      if (zxingRef && (zxingRef as React.RefObject<HTMLVideoElement>).current) {
        const videoEl = (zxingRef as React.RefObject<HTMLVideoElement>).current!;
        try {
          videoEl.srcObject = stream;
  
          await videoEl.play().catch((e) => {

            console.warn("videoEl.play() warning:", e);
          });
          console.log("Camera stream attached to video element.");
        } catch (e) {
          console.warn("Failed to attach stream to video element:", e);
          setError("Failed to attach camera stream to the element.");
        }
      } else {
        console.warn("zxingRef.current not ready when attaching stream. Stream will still exist.");
      }

      setIsCameraAllowed(true);
      setError(null);
    } catch (err: any) {
      console.error("getUserMedia error:", err);

      if (err.name === "NotAllowedError") {
        setError("Camera access was denied. Please allow camera permissions.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Attach a camera and try again.");
      } else {
        setError("Unable to access camera. Check permissions and HTTPS.");
      }
      setIsCameraAllowed(false);
    } finally {
      setLoadingCamera(false);
    }
  };

        // --------------------------------------------------------
        // Cleans up camera when unloading
        // --------------------------------------------------------
  useEffect(() => {
    return () => {
      const videoEl = (zxingRef as React.RefObject<HTMLVideoElement>).current;
      if (videoEl?.srcObject) {
        (videoEl.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
        videoEl.srcObject = null;
        console.log("Stopped camera tracks on unmount.");
      }
    };
   
  }, []);

  const handleStartScanning = async () => {
    setError(null);
    setIsSetupDone(true);
    await requestCameraAccess();
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black/90">
        <Loader2 className="h-10 w-10 animate-spin text-green-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-white px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          📷 iReader
        </h1>
        <p className="text-gray-400 text-sm">
          Scan your iQR code to record attendance
        </p>
      </div>
      <AnimatePresence>
        {!isSetupDone && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-900/30 p-6 rounded-2xl border border-green-400 w-80 text-center"
          >
            <h2 className="text-lg font-semibold mb-4 text-green-300">
              Select Attendance Date
            </h2>

            <input
              type="date"
              value={sheetDate}
              onChange={(e) => setSheetDate(e.target.value)}
              className="w-full text-center text-sm bg-transparent border border-green-400 rounded-md px-2 py-2 text-white"
            />

            {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStartScanning}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md mt-4"
              disabled={loadingCamera}
            >
              {loadingCamera ? "Requesting camera..." : "🚀 Start Scanning"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSetupDone && (
          <motion.div
            key="scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            {!isCameraAllowed ? (
              <motion.button
                onClick={requestCameraAccess}
                whileTap={{ scale: 0.95 }}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg"
                disabled={loadingCamera}
              >
                {loadingCamera ? "Requesting camera..." : "Allow Camera Access"}
              </motion.button>
            ) : (
              <div className="relative w-80 h-80 rounded-2xl overflow-hidden border-2 border-green-400 shadow-lg">
                <video
            
                  ref={zxingRef as React.RefObject<HTMLVideoElement>}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />

          
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-[3px] border-green-400 rounded-xl"></div>
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl"></div>
                </div>
              </div>
            )}

            {decodedData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 bg-green-900/30 p-5 rounded-xl border border-green-400 w-80 text-center"
              >
                <h2 className="text-xl font-bold text-green-300 mb-2">
                  ✅ QR Code Data
                </h2>
                <div className="text-white text-sm space-y-1">
                  <p><span className="text-gray-400">Name:</span> {decodedData.name}</p>
                  <p><span className="text-gray-400">ID:</span> {decodedData.idNumber}</p>
                  <p><span className="text-gray-400">Year:</span> {decodedData.yearLevel}</p>
                  <p><span className="text-gray-400">Section:</span> {decodedData.section}</p>
                  {decodedData.expiresAt && (
                    <p className="text-gray-400 text-xs mt-2">
                      Expires: {new Date(decodedData.expiresAt).toLocaleString("en-PH")}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {notification && (
          <motion.div
            key="notif"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className={`fixed bottom-6 px-6 py-3 rounded-xl text-white shadow-lg ${
              notification.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

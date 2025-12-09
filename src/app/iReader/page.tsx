"use client";

import React, {
    useEffect,
    useState,
    useCallback,
    useMemo,
    memo,
} from "react";
import { useZxing } from "react-zxing";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
// Ensure you have a cn utility function for this to work correctly (e.g., from shadcn/ui setup)
import { cn } from "@/lib/utils";

// --- Type Definitions ---
// The data structure used by the front-end for display/simple submission
type QRData = {
    name: string;
    idNumber: string;
    yearLevel: string;
    section: string;
    generatedAt?: string;
    expiresAt?: string;
};

// Type representing the full raw object decoded from the QR code (including 'uid')
type RawQRData = QRData & {
    uid?: string; // Made UID optional as per discussion
    yearLevel?: string; // Made optional
    section?: string; // Made optional
};

type NotificationState = {
    type: "success" | "error";
    message: string;
} | null;

// --- Helper Components ---

const Button = memo(
    React.forwardRef<
        HTMLButtonElement,
        HTMLMotionProps<"button">
    >(({ className, disabled, children, ...props }, ref) => (
        <motion.button
            ref={ref}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50 h-11 px-6 py-2",
                "bg-emerald-600/80 text-white shadow-lg hover:bg-emerald-600 active:scale-[0.98] transition-all duration-150",
                className,
            )}
            disabled={disabled}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            {...props}
        >
            {children}
        </motion.button>
    )),
);
Button.displayName = "Button";

const Input = memo(
    React.forwardRef<
        HTMLInputElement,
        React.InputHTMLAttributes<HTMLInputElement>
    >(({ className, ...props }, ref) => (
        <input
            ref={ref}
            className={cn(
                "flex h-11 w-full rounded-lg border border-input bg-transparent px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                "border-slate-700 bg-black/30 text-white focus-visible:ring-emerald-500 transition-colors",
                className,
            )}
            {...props}
        />
    )),
);
Input.displayName = "Input";

// Responsive Glassy Card: max-w-sm on mobile, max-w-lg on larger screens
const GLASSY_CARD_CLASS =
    "p-6 sm:p-8 rounded-2xl border border-slate-700 bg-black/10 shadow-2xl backdrop-blur-xl w-full max-w-sm md:max-w-lg";

// --- Main Component ---
export default function IReader() {
    const [decodedData, setDecodedData] = useState<QRData | null>(null);
    const [isCameraAllowed, setIsCameraAllowed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSetupDone, setIsSetupDone] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastScanned, setLastScanned] = useState<Set<string>>(new Set());
    const [notification, setNotification] = useState<NotificationState>(null);
    const [loadingCamera, setLoadingCamera] = useState(false);
    const [sheetDate, setSheetDate] = useState(
        new Date().toISOString().split("T")[0],
    );

    const showNotification = useCallback(
        (type: "success" | "error", message: string) => {
            setNotification({ type, message });
            setTimeout(() => setNotification(null), 3000);
        },
        [],
    );

    // FIX: Updated to accept and validate the RawQRData structure, including 'uid'
    const decodeAndValidateQr = (text: string): RawQRData => {
        let json: RawQRData;

        try {
            json = JSON.parse(atob(text)) as RawQRData;
        } catch {
            try {
                json = JSON.parse(text) as RawQRData;
            } catch (e) {
                throw new Error("Invalid QR content format (not JSON or base64(JSON)).");
            }
        }

        // CRITICAL CHECK: Only enforce the presence of ID Number and Name
        if (
            !json.idNumber ||
            !json.name
        ) {
            throw new Error("Missing critical student data (ID or Name).");
        }

        // CHECK: Expiration
        const now = new Date();
        const expiresAt = json.expiresAt ? new Date(json.expiresAt) : null;

        if (expiresAt && now > expiresAt) {
            throw new Error("QR Code has expired.");
        }

        // CHECK: Duplicate check (using ID number)
        const uniqueKey = `${json.idNumber}`;
        if (lastScanned.has(uniqueKey)) {
            throw new Error("QR already scanned previously.");
        }

        return json;
    };

    const { ref: zxingRef } = useZxing({
        onDecodeResult(result) {
            if (isProcessing) return;
            setIsProcessing(true);

            let rawStudentData: RawQRData | null = null;
            try {
                rawStudentData = decodeAndValidateQr(result.getText());
            } catch (e: any) {
                const message = e.message.includes("expired")
                    ? "❌ QR Code has expired."
                    : e.message.includes("scanned")
                        ? "⚠️ QR already scanned previously!"
                        : "❌ Invalid QR format/data.";

                showNotification("error", message);
                console.error("QR Processing Error:", e);
                setIsProcessing(false);
                return;
            }

            // Extract fields for display (QRData)
            const studentData: QRData = {
                name: rawStudentData.name || "N/A", // Use N/A as fallback for display if optional fields were truly missing
                idNumber: rawStudentData.idNumber || "N/A",
                yearLevel: rawStudentData.yearLevel || "N/A",
                section: rawStudentData.section || "N/A",
                generatedAt: rawStudentData.generatedAt,
                expiresAt: rawStudentData.expiresAt,
            };

            setLastScanned((prev) => new Set([...prev, studentData.idNumber]));
            setDecodedData(studentData);

            // Send the raw data (including uid) to the backend API
            fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...rawStudentData,
                    sheetDate
                }),
            })
                .then(async (res) => {
                    if (res.ok) {
                        showNotification(
                            "success",
                            `✅ ${studentData.name} recorded successfully!`,
                        );
                    } else {
                        const err = await res.json().catch(() => ({}));
                        showNotification(
                            "error",
                            `❌ Failed: ${err.error || "Unknown error"}`,
                        );
                    }
                })
                .catch((e) => {
                    console.error("Network error posting attendance:", e);
                    showNotification("error", "⚠️ Network error. Try again.");
                })
                .finally(() => {
                    setTimeout(() => setIsProcessing(false), 2000);
                });
        },
        paused: !isCameraAllowed,
        constraints: useMemo(() => ({ video: { facingMode: "environment" } }), []),
    });

    const requestCameraAccess = useCallback(async () => {
        setError(null);
        setLoadingCamera(true);

        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Camera not supported. Use Chrome/Edge/Safari on HTTPS.");
            setLoadingCamera(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });

            const videoEl = (zxingRef as React.RefObject<HTMLVideoElement>).current;

            if (videoEl) {
                if (videoEl.srcObject) {
                    (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
                }
                videoEl.srcObject = stream;
                await videoEl.play().catch((e) => {
                    console.warn("videoEl.play() warning:", e);
                });
            } else {
                stream.getTracks().forEach((t) => t.stop());
            }

            setIsCameraAllowed(true);
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
    }, [zxingRef]);

    const handleStartScanning = async () => {
        setError(null);
        setIsSetupDone(true);
        await requestCameraAccess();
    };

    useEffect(() => {
        return () => {
            const videoEl = (zxingRef as React.RefObject<HTMLVideoElement>).current;

            if (videoEl?.srcObject) {
                (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
                videoEl.srcObject = null;
            }
        };
    }, [zxingRef]);


    return (
        <div className="flex flex-col items-center justify-start min-h-screen text-slate-100 px-4 py-8 sm:py-12 md:py-16">

            {/* Header */}
            <div className="text-center mb-8 sm:mb-10 w-full max-w-lg">
                <h1 className="text-4xl sm:text-5xl font-extrabold flex items-center justify-center gap-3 tracking-tight text-emerald-400">
                    <span className="text-slate-300">📷</span> iReader
                </h1>
                <p className="text-base sm:text-lg text-slate-400 mt-2">
                    Scan your iQR code to record **daily attendance**
                </p>
            </div>

            <AnimatePresence mode="wait">
                {!isSetupDone && (
                    <motion.div
                        key="setup"
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(GLASSY_CARD_CLASS, "text-center")}
                        exit={{ opacity: 0, y: -20 }}
                        initial={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-slate-200">
                            Attendance Date Selection
                        </h2>

                        <Input
                            type="date"
                            value={sheetDate}
                            onChange={(e) => setSheetDate(e.target.value)}
                            className="mb-6 text-center"
                        />

                        {error && <p className="text-red-400 text-sm sm:text-base">{error}</p>}

                        <Button
                            className="w-full"
                            disabled={loadingCamera}
                            onClick={handleStartScanning}
                        >
                            {loadingCamera ? "Requesting camera..." : "🚀 Start Scanning"}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSetupDone && (
                    <motion.div
                        key="scanner"
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-2xl"
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Camera Viewport */}
                        {!isCameraAllowed ? (
                            <div className={cn(GLASSY_CARD_CLASS, "py-10")}>
                                {error && (
                                    <p className="text-red-400 text-center mb-6 text-base">{error}</p>
                                )}
                                <Button
                                    className="w-full"
                                    disabled={loadingCamera}
                                    onClick={requestCameraAccess}
                                >
                                    {loadingCamera
                                        ? "Requesting camera..."
                                        : "Allow Camera Access"}
                                </Button>
                            </div>
                        ) : (
                            // CAMERA LAYOUT: Responsive and Centered
                            <div
                                className={cn(
                                    "relative w-full aspect-square max-w-[400px] md:max-w-[500px] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300",
                                    isProcessing ? "ring-4 ring-emerald-500" : "ring-4 ring-emerald-400/80 animate-pulse",
                                )}
                            >
                                <video
                                    ref={zxingRef as React.RefObject<HTMLVideoElement>}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />

                                {/* Visual Scanner Guide/Frame */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div
                                        className={cn(
                                            "w-[70%] h-[70%] border-4 rounded-xl transition-all duration-300",
                                            isProcessing ? "border-emerald-600/50" : "border-emerald-400/80"
                                        )}
                                        style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)' }}
                                    />
                                    <motion.div
                                        className="absolute w-[60%] h-1 bg-emerald-400/90 rounded-full"
                                        initial={{ y: "calc(-35% + 2px)" }}
                                        animate={{ y: "calc(35% - 2px)" }}
                                        transition={{
                                            repeat: Infinity,
                                            repeatType: "reverse",
                                            duration: 2,
                                            ease: "easeInOut",
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Decoded Data Card */}
                        {decodedData && (
                            <motion.div
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(GLASSY_CARD_CLASS, "mt-0 text-center")}
                                initial={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="text-xl sm:text-2xl font-bold text-emerald-400 mb-4">
                                    <span className="text-slate-200">✅</span> Scan Successful!
                                </h2>

                                {/* Highlighted Name */}
                                <p className="text-2xl sm:text-3xl font-extrabold text-white mb-4 break-words">
                                    {decodedData.name}
                                </p>

                                {/* Data Grid */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-base sm:text-lg text-left">
                                    <div className="col-span-1">
                                        <span className="text-slate-400 font-medium">ID Number:</span>
                                    </div>
                                    <div className="col-span-1 font-semibold text-slate-50 truncate">
                                        {decodedData.idNumber}
                                    </div>

                                    <div className="col-span-1">
                                        <span className="text-slate-400 font-medium">Year Level:</span>
                                    </div>
                                    <div className="col-span-1 font-semibold text-slate-50">
                                        {decodedData.yearLevel}
                                    </div>

                                    <div className="col-span-1">
                                        <span className="text-slate-400 font-medium">Section:</span>
                                    </div>
                                    <div className="col-span-1 font-semibold text-slate-50">
                                        {decodedData.section}
                                    </div>
                                </div>

                                {/* Expiration */}
                                {decodedData.expiresAt && (
                                    <p className="text-slate-500 text-xs sm:text-sm pt-4 border-t border-slate-700 mt-4">
                                        QR Expires:{" "}
                                        {new Date(decodedData.expiresAt).toLocaleString("en-PH")}
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {notification && (
                    <motion.div
                        key="notif"
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "fixed bottom-4 sm:bottom-8 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold text-white shadow-xl backdrop-blur-sm transition-all duration-300",
                            notification.type === "success"
                                ? "bg-emerald-600/90"
                                : "bg-red-600/90",
                        )}
                        exit={{ opacity: 0, y: 30 }}
                        initial={{ opacity: 0, y: 30 }}
                        transition={{ duration: 0.3 }}
                    >
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
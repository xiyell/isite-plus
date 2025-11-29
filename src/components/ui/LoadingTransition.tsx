"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1800); // ⏱️ Faster exit for mobile
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-9999 flex items-center justify-center bg-linear-to-b from-purple-950 to-purple-900 overflow-hidden will-change-transform will-change-opacity"
        >
          {/* ✅ Optimized sweeping light */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent "
            style={{ willChange: "transform" }}
          />

          {/* ✅ Lightweight ISITE+ text */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative text-6xl md:text-8xl font-extrabold tracking-tight select-none text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]"
            style={{ willChange: "opacity, transform" }}
          >
            ISITE
            <motion.span
              initial={{ color: "#c084fc" }}
              animate={{
                color: ["#a855f7", "#c084fc", "#d8b4fe", "#a855f7"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="ml-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.6)]"
            >
              +
            </motion.span>
          </motion.h1>

        </motion.div>
      )}
    </AnimatePresence>
  );
}

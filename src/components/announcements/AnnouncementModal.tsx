"use client";

import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Announcement } from "@/types/announcement";

interface Props {
  selected: Announcement | null;
  onClose: () => void;
  fallbackImage: string;
}

export default function AnnouncementModal({ selected, onClose, fallbackImage }: Props) {
  if (!selected) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal container */}
      <motion.div
        className="fixed inset-0 z-70 flex items-start justify-center p-4 pt-24 sm:pt-32"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-300 hover:text-white transition z-10"
          >
            ✕
          </button>

          {/* Scrollable Content */}
          <ScrollArea className="h-[80vh] rounded-2xl">
            <div className="p-6 flex flex-col gap-4">
              {/* Image */}
              {selected.image || fallbackImage ? (
                <motion.img
                  src={selected.image || fallbackImage}
                  alt={selected.title}
                  className="w-full h-auto max-h-[50vh] object-contain rounded-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                />
              ) : null}

              {/* Title & Description */}
              <h2 className="text-2xl font-bold">{selected.title}</h2>
              <p className="text-gray-300 whitespace-pre-line">{selected.description}</p>

              {/* Metadata */}
              <p className="text-sm text-gray-400">
                {selected.createdAt
                  ? new Date(selected.createdAt).toLocaleString()
                  : "No date"}
              </p>
            </div>
          </ScrollArea>
        </div>
      </motion.div>
    </>
  );
}

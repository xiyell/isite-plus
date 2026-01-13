"use client";

import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Announcement } from "@/types/announcement";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, UserIcon, X } from "lucide-react";
import Image from "next/image";
import { AspectRatio } from "@/components/ui/AspectRatio";

interface Props {
  selected: Announcement | null;
  onClose: () => void;
  fallbackImage: string;
}

export default function AnnouncementModal({ selected, onClose, fallbackImage }: Props) {
  const [imgSrc, setImgSrc] = useState<string>("");

  useEffect(() => {
    if (selected) {
      setImgSrc(selected.image || fallbackImage || "/assets/pupsmb-banner-logo.jpg");
    }
  }, [selected, fallbackImage]);

  if (!selected) return null;

  return (
    <Dialog open={!!selected} onOpenChange={(open) => !open && onClose()}>
      {/* [&>button]:hidden hides the default shadcn close button so we only have our custom premium one */}
      <DialogContent className="w-full max-w-[90vw] sm:max-w-3xl p-0 overflow-hidden bg-zinc-950/95 backdrop-blur-3xl border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] rounded-xl sm:rounded-[2rem] [&>button]:hidden max-h-[75vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto flex-1 w-full overscroll-y-contain">
          <div className="relative group shrink-0">
            <AspectRatio ratio={16 / 9} className="overflow-hidden">
              <Image
                src={imgSrc}
                alt={selected.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                onError={() => setImgSrc("/assets/pupsmb-banner-logo.jpg")}
                priority
              />
            </AspectRatio>
            {/* Enhanced Gradient for better content transition */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent opacity-90" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent" />
            
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2.5 rounded-full bg-black/60 backdrop-blur-xl text-white/90 hover:text-white hover:bg-black/90 hover:scale-110 transition-all z-50 border border-white/20 shadow-2xl"
            >
              <X size={22} />
            </button>
          </div>

          <div className="p-6 sm:p-14 sm:pt-10 pb-20 space-y-6 sm:space-y-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-medium">
                <CalendarIcon size={14} />
                {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Recent'}
              </div>
              {selected.postedBy?.name && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                  <UserIcon size={14} />
                  {selected.postedBy.name}
                </div>
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight leading-tight bg-gradient-to-br from-white to-white/60 bg-clip-text break-words">
              {selected.title}
            </h2>

            <div className="space-y-4 text-zinc-300 leading-relaxed text-lg font-normal">
              <p className="whitespace-pre-line text-base sm:text-lg break-words">
                {selected.description}
              </p>
            </div>

            <div className="mt-12 flex justify-end">
                <button
                    onClick={onClose}
                    className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all"
                >
                    Dismiss
                </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

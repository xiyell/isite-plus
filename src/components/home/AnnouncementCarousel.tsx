"use client";

import { getLatestAnnouncements } from "@/actions/announcements";
import { Announcement } from "@/types/announcement";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { db } from "@/services/firebase";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Card, CardContent } from "../ui/Card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import AnnouncementModal from "../announcements/AnnouncementModal";
function Loading() {
  return (
    <h1 className="text-white">Loading Announcements</h1>
  )
}
// Sub-component for individual card with robust image handling
const CarouselCard = ({ item, onClick }: { item: Announcement; onClick: () => void }) => {
  const DEFAULT_IMAGE = "/assets/pupsmb-banner-logo.jpg";
  const [imgSrc, setImgSrc] = useState(item.image || DEFAULT_IMAGE);

  return (
    <Card
      onClick={onClick}
      className="relative w-[300px] h-[400px] sm:w-[380px] sm:h-[380px] md:w-[600px] md:h-[420px] rounded-[2.5rem] overflow-hidden border border-white/10 group transition-all duration-500 shadow-2xl hover:border-fuchsia-500/50"
    >
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={imgSrc}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          priority
          onError={() => setImgSrc(DEFAULT_IMAGE)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent opacity-100" />
      </div>

      <CardContent className="absolute inset-0 flex flex-col justify-end items-start text-left text-white z-10 p-8 sm:p-12">
        <div className="relative z-20 w-full drop-shadow-2xl">
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mb-4"
            >
                <span className="px-4 py-1.5 bg-fuchsia-600/40 border border-fuchsia-400/50 rounded-full text-[10px] uppercase tracking-[0.2em] font-black text-fuchsia-100 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                    Featured News
                </span>
            </motion.div>
            <h3 className="text-xl sm:text-3xl font-black mb-3 leading-tight tracking-tight group-hover:text-fuchsia-300 transition-colors [text-shadow:_0_4px_16px_rgba(0,0,0,1)] uppercase">
                {item.title}
            </h3>
            <p className="text-xs sm:text-base text-zinc-100/90 line-clamp-2 font-semibold max-w-lg mb-2 [text-shadow:_0_2px_10px_rgba(0,0,0,1)]">
                {item.description}
            </p>
            <div className="w-16 h-1.5 bg-fuchsia-500 rounded-full mt-6 transform origin-left transition-all duration-500 group-hover:w-40 shadow-[0_0_20px_rgba(217,70,239,0.6)]" />
        </div>
      </CardContent>
      
      {/* Decorative glass shine */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    </Card>
  );
};

export default function AnnouncementCarousel() {

  const [featuredAnnouncements, setFeaturedAnnouncements] = useState<Announcement[]>([])
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Announcement | null>(null);
  useEffect(() => {
    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(6) // Fetch a few more to account for filtered items
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        } as Announcement))
        .filter(a => a.status === "active")
        .slice(0, 3); // Take top 3 after filtering
      setFeaturedAnnouncements(data);
    });

    return () => unsubscribe();
  }, []);

  const nextSlide = () =>
    setIndex((prev) => (prev + 1) % featuredAnnouncements.length);
  const prevSlide = () =>
    setIndex((prev) => (prev - 1 + featuredAnnouncements.length) % featuredAnnouncements.length);

  // autoplay
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [featuredAnnouncements]);



  const handleDotClick = (i: number) => setIndex(i);

  return (
    <section className="relative flex flex-col items-center justify-center py-16 overflow-hidden">
      <h2 className="text-4xl sm:text-5xl font-extrabold mb-12 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-400 to-blue-400 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)] text-center">
        Announcements
      </h2>

      {/* Carousel */}
      <div
        className="relative w-full max-w-[950px] h-[500px] flex items-center justify-center"
      >
        {featuredAnnouncements.map((item, i) => {
          const offset = (i - index + featuredAnnouncements.length) % featuredAnnouncements.length;
          let x = 0,
            scale = 1,
            opacity = 1,
            zIndex = 20;

          if (offset === 0) {
            x = 0;
            scale = 1.1;
            opacity = 1;
            zIndex = 50;
          } else if (offset === 1) {
            x = 300;
            scale = 0.85;
            opacity = 0.5;
            zIndex = 30;
          } else if (offset === featuredAnnouncements.length - 1) {
            x = -300;
            scale = 0.85;
            opacity = 0.5;
            zIndex = 30;
          } else {
            x = offset * 200;
            scale = 0.7;
            opacity = 0;
            zIndex = 10;
          }

          return (
            <motion.div
              key={item.id}
              className="absolute cursor-pointer"
              animate={{ x, scale, opacity, zIndex }}
              transition={{ type: "spring", stiffness: 220, damping: 25 }}
            >
              <CarouselCard item={item} onClick={() => setSelected(item)} />
            </motion.div>
          );
        })}


        <button
          onClick={prevSlide}
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 text-white transition-all duration-300"
        >
          <ChevronLeft className="w-9 h-9" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-50 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 text-white transition-all duration-300"
        >
          <ChevronRight className="w-9 h-9" />
        </button>
      </div>

      <div className="flex gap-3 mt-10">
        {featuredAnnouncements.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => handleDotClick(i)}
            className={`w-4 h-4 md:w-5 md:h-5 rounded-full transition-all duration-300 ${i === index
              ? "bg-purple-500 scale-125 shadow-lg shadow-purple-500/50"
              : "bg-white/20 hover:bg-white/40"
              }`}
          />
        ))}
      </div>



      <AnimatePresence>
        {selected && (
          <AnnouncementModal selected={selected} onClose={() => setSelected(null)} fallbackImage="/assets/default-announcement.jpg" />
        )}
      </AnimatePresence>
    </section>
  );
}

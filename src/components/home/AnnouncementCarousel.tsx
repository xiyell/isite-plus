"use client";

import { getLatestAnnouncements } from "@/actions/announcements";
import { Announcement } from "@/types/announcement";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { Card, CardContent } from "../ui/Card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import AnnouncementModal from "../announcements/AnnouncementModal";
function Loading() { 
    return (
        <h1 className="text-white">Loading Announcements</h1>
    )
}
export default function AnnouncementCarousel() {

    const [featuredAnnouncements, setFeaturedAnnouncements] = useState<Announcement[]>([])
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState<any | null>(null);
    useEffect(() => {
        (async () => {
            // Fetch the latest 3 announcements in our database
            const data = await getLatestAnnouncements(3);
            setFeaturedAnnouncements(data);
        })();
    }, []);

      // autoplay
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(timer);
  }, [featuredAnnouncements]);

  const nextSlide = () =>
    setIndex((prev) => (prev + 1) % featuredAnnouncements.length);
  const prevSlide = () =>
    setIndex((prev) => (prev - 1 + featuredAnnouncements.length) % featuredAnnouncements.length);

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
              onClick={() => setSelected(item)}
            >
              <Card
  className=" relative w-[300px] h-[400px] sm:w-[380px] sm:h-[380px] md:w-[570px] md:h-[400px] rounded-3xl overflow-hidden backdrop-blur-md border border-white/20 shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
  style={{
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
  }}
>
    {/* Top image section */}
    <div className="absolute inset-0">
        <Image
        src={item.image ? item.image : "/assets/default-announcement.jpg"}
        alt={item.title}
        fill
        className="object-cover opacity-80"
        priority
        />
    </div>
 <CardContent className="absolute inset-0 flex flex-col justify-end items-start text-left text-white z-10 p-6 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
    <h3 className="text-2xl font-semibold mb-2">{item.title}</h3>
    <p className="text-base opacity-80 line-clamp-2">{item.description}</p>
  </CardContent>
    </Card>

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
            className={`w-4 h-4 md:w-5 md:h-5 rounded-full transition-all duration-300 ${
              i === index
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

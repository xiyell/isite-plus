"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface Announcement {
  id: string;
  title: string;
  description: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
  postedBy?: {
    id: string;
    name: string;
    profilePic?: string;
    grade?: string;
    section?: string;
  } | null;
}

interface Props {
  item: Announcement;
  fallbackImage?: string;
  onSelect: (item: Announcement) => void;
}

export default function AnnouncementCard({ item, fallbackImage, onSelect }: Props) {
  const [imgSrc, setImgSrc] = useState(item.image || fallbackImage || "/favicon.ico");

  return (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className="group rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 
                 backdrop-blur-xl p-8 flex flex-col justify-between shadow-lg 
                 hover:shadow-[0_0_25px_-8px_rgba(217,70,239,0.4)] 
                 transition-all duration-300 cursor-pointer h-[320px]"
      onClick={() => onSelect(item)}
    >

      <motion.img
        src={imgSrc}
        alt={item.title}
        className="h-32 w-full object-cover rounded-xl mb-4 border border-white/10 bg-white/10"
        whileHover={{ scale: 1.03 }}
        onError={() => setImgSrc(fallbackImage || "/placeholder.jpg")}
      />

      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-fuchsia-400 transition-colors line-clamp-1">
        {item.title}
      </h3>

      <p className="text-sm text-gray-300 leading-snug mb-3 line-clamp-3">
        {item.description}
      </p>

      <div className="text-xs text-gray-400">
        {item.createdAt
          ? new Date(item.createdAt).toLocaleString()
          : "No date"}
      </div>
    </motion.div>
  );
}

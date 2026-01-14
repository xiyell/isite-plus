"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { CalendarIcon, MessageSquareIcon } from "lucide-react";
import Image from "next/image";
import { db } from "@/services/firebase";
import { collection, query, where, orderBy, limit as firestoreLimit, onSnapshot } from "firebase/firestore";

// shadcn/ui components
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/AspectRatio";

// Custom/Conceptual Imports
import { getLatestAnnouncements } from "@/actions/announcements";
import { Announcement } from "@/types/announcement"; // Assuming this type is available
import AnnouncementModal from "./AnnouncementModal";

// --- Internal Utility Components (Keep these for component reusability) ---


/** 2. Announcement Card Component (using shadcn Card) */
function AnnouncementCard({
    item,
    onSelect,
    fallbackImage,
}: {
    item: Announcement;
    onSelect: (item: Announcement) => void;
    fallbackImage: string;
}) {
    const cardVariants = {
        hidden: { opacity: 0, y: 50, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6 } },
    };

    return (
        <motion.div
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="h-full"
        >
            <Card
                onClick={() => onSelect(item)}
                className="flex flex-col h-full cursor-pointer bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:border-fuchsia-500/50 transition-all duration-300 shadow-2xl hover:shadow-fuchsia-500/20 group overflow-hidden rounded-[1.5rem]"
            >
                <div className="relative w-full overflow-hidden">
                    <AspectRatio ratio={16 / 9}>
                        <Image
                            src={item.image || fallbackImage}
                            alt={item.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                        />
                    </AspectRatio>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                </div>
                <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-white group-hover:text-fuchsia-300 transition-colors line-clamp-2 min-h-[3.5rem] tracking-tight">
                        {item.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2 text-xs font-medium text-white/50 uppercase tracking-[0.15em]">
                        <CalendarIcon className="h-4 w-4 text-fuchsia-500/60" />
                        <span>
                            {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </CardHeader>
                <CardFooter className="mt-auto pt-4 pb-8">
                    <Button variant="outline" className="w-full rounded-xl border-white/10 bg-white/5 hover:bg-fuchsia-600 hover:text-white hover:border-transparent transition-all font-bold text-[10px] uppercase tracking-[0.2em] py-6 shadow-xl active:scale-95">
                        View Details
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

// 3. Featured Card Component
function FeaturedAnnouncement({
    item,
    onSelect,
    fallbackImage,
}: {
    item: Announcement;
    onSelect: (item: Announcement) => void;
    fallbackImage: string;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.005 }}
            className="group relative w-[92%] sm:w-full max-w-5xl mx-auto h-[40vh] min-h-[400px] overflow-hidden rounded-[2.5rem] cursor-pointer shadow-2xl transition-all duration-700 border border-white/10 hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/20"
            onClick={() => onSelect(item)}
        >
            <div className="absolute inset-0 z-0">
                <div className="hidden sm:block h-full">
                    <AspectRatio ratio={21 / 9} className="h-full">
                        <Image
                            src={item.image || fallbackImage}
                            alt={item.title}
                            fill
                            sizes="100vw"
                            className="object-cover brightness-[0.7] group-hover:brightness-90 group-hover:scale-105 transition-all duration-1000"
                            priority
                        />
                    </AspectRatio>
                </div>
                <div className="sm:hidden h-full">
                    <AspectRatio ratio={1 / 1} className="h-full">
                        <Image
                            src={item.image || fallbackImage}
                            alt={item.title}
                            fill
                            sizes="100vw"
                            className="object-cover brightness-[0.7] group-hover:brightness-90 group-hover:scale-105 transition-all duration-1000"
                            priority
                        />
                    </AspectRatio>
                </div>
            </div>
            
            <div className="absolute inset-0 z-10 flex flex-col justify-end p-8 sm:p-14 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent">
                <div className="max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-6"
                    >
                        <span className="px-6 py-2 bg-fuchsia-600 rounded-full text-[11px] font-black tracking-[0.25em] text-white shadow-2xl shadow-fuchsia-900/60 uppercase">
                            ★ FEATURED
                        </span>
                    </motion.div>
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.05] mb-4 drop-shadow-2xl line-clamp-2 tracking-tighter group-hover:text-fuchsia-300 transition-colors">
                        {item.title}
                    </h2>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-[0.2em] italic">
                        {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>
            
            {/* Decorative glass shine */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-tr from-fuchsia-500/10 to-transparent pointer-events-none" />
        </motion.section>
    );
}

// 4. Loading Skeleton Component
function AnnouncementSkeleton() {
    return Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="flex flex-col h-full">
            <div className="w-full">
                <AspectRatio ratio={16 / 9}>
                    <Skeleton className="h-full w-full rounded-t-lg" />
                </AspectRatio>
            </div>
            <CardHeader>
                <Skeleton className="h-4 w-3/4 mb-2" />
            </CardHeader>
            <CardContent className="flex-grow">
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    ));
}

// ----------------------------------------------------------------------
// *** REUSABLE ANNOUNCEMENT FEED COMPONENT ***
// ----------------------------------------------------------------------

interface AnnouncementsFeedProps {
    // Allows you to control how many announcements are fetched for this instance
    limit?: number;
    // Allows you to override the default image for different parts of your site
    defaultFallbackImage?: string;
    // Number of items to skip (e.g., if shown in a carousel above)
    skip?: number;
}

export function AnnouncementsFeed({ limit = 10, skip = 0, defaultFallbackImage }: AnnouncementsFeedProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Announcement | null>(null);

    // Use the provided image or the default one
    const fallbackImage = defaultFallbackImage || "https://img.freepik.com/premium-photo/random-image_590832-9941.jpg";

    // Fetch announcements in real-time
    useEffect(() => {
        setLoading(true);

        const q = query(
            collection(db, "announcements"),
            orderBy("createdAt", "desc"),
            firestoreLimit(50) 
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
                .slice(skip, skip + limit); // Skip the first 'n' featured items, then take 'limit' items
                
            setAnnouncements(data);
            setLoading(false);
        }, (error) => {
            console.error("Error loading announcements:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [limit, skip]);

    return (
        <div className="w-full flex flex-col gap-16">
            {/* 3. Announcements Grid */}
            <div className="px-6 sm:px-0 max-w-6xl mx-auto w-full">
                <motion.div
                    animate="visible"
                    className="flex flex-wrap justify-center gap-8 pb-20 items-stretch"
                    initial="hidden"
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.1 } },
                    }}
                >
                    {loading
                        ? <AnnouncementSkeleton />
                        : announcements.map((item) => (
                            // Flexbox item wrapper for proper centering and sizing
                            <div 
                                key={item.id} 
                                className="w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.4rem)]"
                            >
                                <AnnouncementCard
                                    fallbackImage={fallbackImage}
                                    item={item}
                                    onSelect={setSelected}
                                />
                            </div>
                        ))}

                    {!loading && announcements.length === 0 && (
                        <div className="text-center col-span-full py-20 bg-zinc-900/50 backdrop-blur-md rounded-[2rem] border border-white/10 border-dashed">
                            <p className="text-white/60 font-bold uppercase tracking-widest text-sm">
                                No additional announcements found
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* 4. Modal */}
            <AnnouncementModal
                fallbackImage={fallbackImage}
                selected={selected}
                onClose={() => setSelected(null)}
            />
        </div>
    );
}

// ----------------------------------------------------------------------
// *** PAGE COMPONENT (Wrapper for the Feed) ***
// ----------------------------------------------------------------------

export default function AnnouncementPage() {
    return (
        <div className="min-h-screen w-full flex flex-col gap-16 p-4 md:p-8">
            {/* 1. Title Section (Keep this on the page where it belongs) */}
            <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col items-center justify-center text-center h-[10vh] pt-10"
                initial={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <h1 className="text-5xl md:text-6xl font-extrabold text-foreground mb-4 tracking-tight">
                    📢 **Announcements**
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                    Stay informed with the latest updates, news, and community highlights.
                </p>
            </motion.div>

            {/* --- Horizontal Rule --- */}
            <hr className="w-1/3 mx-auto border-t border-muted-foreground/20" />

             <div className="container mx-auto">
                <AnnouncementsFeed limit={7} />
             </div>
        </div>
    );
}
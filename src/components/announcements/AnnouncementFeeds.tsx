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
            whileHover={{ y: -5, transition: { duration: 0.3 } }}
            className="h-full"
        >
            <Card
                onClick={() => onSelect(item)}
                className="flex flex-col h-full cursor-pointer transition-shadow hover:shadow-xl dark:hover:shadow-primary/50"
            >
                <div className="relative w-full">
                    <AspectRatio ratio={16 / 9}>
                        <Image
                            src={item.image || fallbackImage}
                            alt={item.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="rounded-t-lg object-cover"
                            loading="lazy"
                        />
                    </AspectRatio>
                </div>
                <CardHeader>
                    <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="truncate">
                            {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                        {item.description}
                    </p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full">
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
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative w-full max-w-6xl mx-auto rounded-xl overflow-hidden shadow-2xl transition-shadow hover:shadow-primary/50 cursor-pointer"
            onClick={() => onSelect(item)}
        >
            <div className="relative w-full">
                <AspectRatio ratio={21 / 9}>
                    <Image
                        src={item.image || fallbackImage}
                        alt={item.title}
                        fill
                        sizes="100vw"
                        className="object-cover brightness-50"
                        priority
                    />
                </AspectRatio>
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
                <span className="inline-block px-3 py-1 text-xs font-medium text-primary-foreground bg-primary rounded-full mb-3">
                    ⭐ Featured
                </span>
                <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 drop-shadow-md">
                    {item.title}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl line-clamp-2">
                    {item.description}
                </p>
                <Button className="mt-6">Read More →</Button>
            </div>
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
}

export function AnnouncementsFeed({ limit = 10, defaultFallbackImage }: AnnouncementsFeedProps) {
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
            firestoreLimit(limit)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
                    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
                } as Announcement))
                .filter(a => a.status === "active"); // Client-side filter to avoid composite index
            setAnnouncements(data);
            setLoading(false);
        }, (error) => {
            console.error("Error loading announcements:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [limit]);

    // Filter out the featured item for the grid
    const featured = announcements[0];
    const gridAnnouncements = announcements.slice(1);

    return (
        <div className="w-full flex flex-col gap-16">

            {/* 2. Featured Announcement */}
            {loading ? (
                <Skeleton className="h-[40vh] w-full max-w-6xl mx-auto rounded-xl" />
            ) : (
                featured && (
                    <FeaturedAnnouncement
                        item={featured}
                        onSelect={setSelected}
                        fallbackImage={fallbackImage}
                    />
                )
            )}

            {/* 3. Announcements Grid */}
            <motion.div
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20 max-w-6xl mx-auto w-full"
                initial="hidden"
                variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.1 } },
                }}
            >
                {loading
                    ? <AnnouncementSkeleton />
                    : gridAnnouncements.map((item) => (
                        <AnnouncementCard
                            key={item.id}
                            fallbackImage={fallbackImage}
                            item={item}
                            onSelect={setSelected}
                        />
                    ))}

                {!loading && announcements.length === 0 && (
                    <p className="text-center col-span-full text-muted-foreground py-10">
                        No announcements found. Check back later!
                    </p>
                )}
            </motion.div>

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

            {/* CALL THE REUSABLE COMPONENT HERE */}
            <AnnouncementsFeed limit={10} />
        </div>
    );
}
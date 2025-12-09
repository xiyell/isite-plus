"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, Variants } from "framer-motion";
import Image from "next/image";
import { CalendarIcon, MessageSquareIcon, Loader2 } from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/AspectRatio";

// App actions / types
import { getLatestAnnouncements } from "@/actions/announcements";
import { Announcement } from "@/types/announcement";

const ANNOUNCEMENTS_PER_PAGE = 6;
const INITIAL_FETCH_LIMIT = 24;

const GLASSY_CARD_CLASSES =
    "border border-white/20 bg-white/5 backdrop-blur-md transition-all duration-300 shadow-xl shadow-fuchsia-600/20 rounded-xl";
const GLASSY_MODAL_CLASSES =
    "max-w-full sm:max-w-[900px] p-0 overflow-hidden border border-fuchsia-300/30 bg-fuchsia-950/80 backdrop-blur-xl shadow-2xl shadow-fuchsia-500/30 rounded-xl";

// --- Fixed version ---
function sanitizeImageSource(src?: string | null, fallback = "/placeholder.png") {
    if (!src || typeof src !== "string") return fallback;

    const trimmed = src.trim();
    if (!trimmed) return fallback;

    // allow absolute URLs
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }

    // allow Next.js-valid relative URLs
    if (trimmed.startsWith("/")) {
        return trimmed;
    }

    // reject all other invalid strings (like "n", "image", "test", etc.)
    return fallback;
}

function formatDate(dateLike?: string | number | Date) {
    try {
        if (!dateLike) return "";
        const d = new Date(dateLike);
        return d.toLocaleDateString();
    } catch (e) {
        return "";
    }
}

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

// --- Subcomponents ---
const AnnouncementSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i} className={`flex flex-col h-full ${GLASSY_CARD_CLASSES}`}>
                    <div className="w-full">
                        <AspectRatio ratio={16 / 9}>
                            <Skeleton className="h-full w-full rounded-t-xl bg-fuchsia-900/50" />
                        </AspectRatio>
                    </div>
                    <CardHeader className="p-3 sm:p-6">
                        <Skeleton className="h-4 w-3/4 mb-2 bg-fuchsia-800/50" />
                    </CardHeader>
                    <CardContent className="flex-grow p-3 pt-0 sm:p-6 sm:pt-0">
                        <Skeleton className="h-12 w-full mb-4 bg-fuchsia-800/50" />
                        <Skeleton className="h-4 w-1/2 bg-fuchsia-800/50" />
                    </CardContent>
                    <CardFooter className="p-3 sm:p-6 pt-0">
                        <Skeleton className="h-10 w-full bg-fuchsia-700/50" />
                    </CardFooter>
                </Card>
            ))}
        </>
    );
};

const AnnouncementCard: React.FC<{
    item: Announcement;
    onSelect: (a: Announcement) => void;
    fallbackImage: string;
}> = React.memo(({ item, onSelect, fallbackImage }) => {
    const imageSource = sanitizeImageSource(item.image, fallbackImage);

    return (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover={{ y: -6, scale: 1.01 }} className="h-full">
            <Card
                onClick={() => onSelect(item)}
                className={`flex flex-col h-full cursor-pointer ${GLASSY_CARD_CLASSES} hover:border-fuchsia-500/60`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(item);
                }}
            >
                <div className="relative w-full">
                    <AspectRatio ratio={16 / 9}>
                        <Image
                            src={imageSource}
                            alt={item.title ?? "announcement image"}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 350px"
                            className="rounded-t-xl object-cover"
                            loading="lazy"
                        />
                    </AspectRatio>
                </div>

                <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="line-clamp-2 text-fuchsia-200 text-lg sm:text-xl">{item.title}</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-fuchsia-300/80">
                        <CalendarIcon className="h-4 w-4" />
                        <span className="truncate">{formatDate(item.createdAt)}</span>
                    </div>
                </CardHeader>

                <CardContent className="flex-grow p-3 pt-0 sm:p-6 sm:pt-0">
                    <p className="line-clamp-4 text-sm text-fuchsia-100/70 min-h-[60px]">{item.description}</p>
                </CardContent>

                <CardFooter className="p-3 sm:p-6 pt-0">
                    <Button variant="outline" className="w-full border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-700/30">
                        View Details
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
});

AnnouncementCard.displayName = "AnnouncementCard";

const FeaturedAnnouncement: React.FC<{
    item: Announcement;
    onSelect: (a: Announcement) => void;
    fallbackImage: string;
}> = ({ item, onSelect, fallbackImage }) => {
    const imageSource = sanitizeImageSource(item.image, fallbackImage);

    return (
        <motion.section
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative w-full max-w-6xl mx-auto overflow-hidden transition-shadow cursor-pointer"
            onClick={() => onSelect(item)}
        >
            <div className="relative w-full rounded-xl overflow-hidden shadow-2xl shadow-fuchsia-500/50 border border-fuchsia-500/40">
                <AspectRatio ratio={16 / 9} className="sm:aspect-[21/9]">
                    <Image src={imageSource} alt={item.title ?? "featured"} fill sizes="100vw" className="object-cover brightness-[0.62]" priority />
                </AspectRatio>

                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/48 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10 z-10">
                    <span className="inline-block px-3 py-1 text-xs font-medium text-white bg-fuchsia-600 rounded-full mb-3 shadow-md">⭐ Featured</span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 drop-shadow-lg">{item.title}</h2>
                    <p className="text-sm md:text-lg text-fuchsia-100/90 max-w-2xl line-clamp-2">{item.description}</p>
                    <Button className="mt-4 sm:mt-6 bg-fuchsia-600 hover:bg-fuchsia-700">Read More →</Button>
                </div>
            </div>
        </motion.section>
    );
};

const AnnouncementModal: React.FC<{
    selected: Announcement | null;
    onClose: () => void;
    fallbackImage: string;
}> = ({ selected, onClose, fallbackImage }) => {
    if (!selected) return null;

    const imageSrc = sanitizeImageSource(selected.image, fallbackImage);

    return (
        <Dialog open={!!selected} onOpenChange={onClose}>
            <DialogContent className={GLASSY_MODAL_CLASSES}>
                <div className="relative">
                    <AspectRatio ratio={16 / 9}>
                        <Image src={imageSrc} alt={selected.title ?? "modal image"} fill className="object-cover" priority />
                    </AspectRatio>
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                </div>

                <div className="p-4 pt-0 sm:p-8 sm:pt-2">
                    <div className="flex flex-wrap items-center gap-x-4 text-sm text-fuchsia-200 mb-4">
                        <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4" />
                            <span>{formatDate(selected.createdAt)}</span>
                        </div>
                        {selected.postedBy?.name && (
                            <div className="flex items-center space-x-2">
                                <MessageSquareIcon className="h-4 w-4" />
                                <span>Posted by: {selected.postedBy.name}</span>
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">{selected.title}</h2>
                    <p className="text-sm sm:text-base text-fuchsia-100/90 whitespace-pre-line leading-relaxed">{selected.description}</p>

                    <Button onClick={onClose} className="mt-6 w-full bg-fuchsia-600 hover:bg-fuchsia-700">Close</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// --- Main Page ---
export default function AnnouncementPage() {
    const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Announcement | null>(null);

    const [page, setPage] = useState(1);
    const [visibleCount, setVisibleCount] = useState(ANNOUNCEMENTS_PER_PAGE);
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);

    const fallbackImage = useMemo(() => "/placeholder.png", []);

    const bottomObserverRef = useRef<HTMLDivElement | null>(null);

    const fetchInitial = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getLatestAnnouncements(INITIAL_FETCH_LIMIT);
            if (Array.isArray(data)) {
                const unique = Array.from(new Map(data.map((d: Announcement) => [d.id, d])).values());
                setAllAnnouncements(unique);
                setPage(1);
                setVisibleCount(ANNOUNCEMENTS_PER_PAGE);
            } else {
                setAllAnnouncements([]);
            }
        } catch (err) {
            console.error("Error loading announcements:", err);
            setAllAnnouncements([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    const featured = allAnnouncements[0] ?? null;
    const nonFeaturedAnnouncements = allAnnouncements.slice(1);
    const gridAnnouncements = nonFeaturedAnnouncements.slice(0, visibleCount);
    const hasMoreAnnouncements = visibleCount < nonFeaturedAnnouncements.length;

    const handleLoadMore = useCallback(() => {
        if (loadMoreLoading) return;
        setLoadMoreLoading(true);
        setTimeout(() => {
            setVisibleCount((prev) => prev + ANNOUNCEMENTS_PER_PAGE);
            setPage((p) => p + 1);
            setLoadMoreLoading(false);
        }, 350);
    }, [loadMoreLoading]);

    useEffect(() => {
        if (!hasMoreAnnouncements) return;
        const el = bottomObserverRef.current;
        if (!el) return;

        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !loadMoreLoading) {
                        handleLoadMore();
                    }
                });
            },
            { root: null, rootMargin: "200px", threshold: 0.1 }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, [hasMoreAnnouncements, handleLoadMore, loadMoreLoading]);

    useEffect(() => {
        const remaining = nonFeaturedAnnouncements.length - visibleCount;
        if (remaining <= 2 && allAnnouncements.length >= INITIAL_FETCH_LIMIT) {
            (async () => {
                try {
                    const nextLimit = allAnnouncements.length + INITIAL_FETCH_LIMIT;
                    const more = await getLatestAnnouncements(nextLimit);
                    if (Array.isArray(more) && more.length > allAnnouncements.length) {
                        const unique = Array.from(new Map(more.map((d: Announcement) => [d.id, d])).values());
                        setAllAnnouncements(unique);
                    }
                } catch (e) { }
            })();
        }
    }, [visibleCount]);

    const initialSkeletonCount = loading ? ANNOUNCEMENTS_PER_PAGE : 0;

    return (
        <div className="min-h-screen w-full flex flex-col gap-12 sm:gap-16 p-4 md:px-10 lg:px-16 py-8 sm:py-12 text-white">
            <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col items-center justify-center text-center pt-8 sm:pt-10"
                initial={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 tracking-tight">📢 Announcements</h1>
                <p className="text-base md:text-lg text-fuchsia-200/80 leading-relaxed max-w-xl">
                    Stay informed with the latest updates, news, and community highlights.
                </p>
            </motion.div>

            <hr className="w-1/3 mx-auto border-t border-fuchsia-500/20" />

            {loading ? (
                <Skeleton className="h-[30vh] sm:h-[40vh] w-full max-w-6xl mx-auto rounded-xl bg-fuchsia-900/50" />
            ) : (
                featured && <FeaturedAnnouncement item={featured} onSelect={setSelected} fallbackImage={fallbackImage} />
            )}

            <motion.div
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 pb-10 sm:pb-20 max-w-6xl mx-auto w-full"
                initial="hidden"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            >
                {loading && <AnnouncementSkeleton count={initialSkeletonCount} />}

                {!loading &&
                    gridAnnouncements.map((item) => (
                        <AnnouncementCard key={item.id} fallbackImage={fallbackImage} item={item} onSelect={setSelected} />
                    ))}

                {!loading && allAnnouncements.length === 0 && (
                    <p className="text-center col-span-full text-fuchsia-300/70 py-10">
                        No announcements found. Check back later!
                    </p>
                )}
            </motion.div>

            <div className="w-full max-w-6xl mx-auto text-center mt-4 mb-10">
                {hasMoreAnnouncements ? (
                    <div className="flex items-center justify-center gap-4">
                        <Button
                            onClick={handleLoadMore}
                            disabled={loadMoreLoading}
                            className="bg-fuchsia-600 hover:bg-fuchsia-700 min-w-[200px]"
                        >
                            {loadMoreLoading ? (
                                <span className="flex items-center justify-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                                </span>
                            ) : (
                                `Load More (${Math.max(0, nonFeaturedAnnouncements.length - visibleCount)} remaining)`
                            )}
                        </Button>
                    </div>
                ) : (
                    !loading &&
                    allAnnouncements.length > 0 && (
                        <p className="text-sm text-fuchsia-300/70">You’re caught up — no more announcements for now.</p>
                    )
                )}

                <div ref={bottomObserverRef} style={{ height: 1 }} />
            </div>

            <AnnouncementModal fallbackImage={fallbackImage} selected={selected} onClose={() => setSelected(null)} />
        </div>
    );
}

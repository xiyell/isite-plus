'use client';

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Third-party imports
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Edit, Bot, X, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Firebase imports
import {
    onSnapshot,
    collection,
    doc,
    setDoc,
    updateDoc,
    addDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"; // Add Select imports
import { getAnnouncements } from "@/actions/announcements";

// ...

// Update Type
interface BotResponse {
    id: string;
    trigger: string;
    reply: string;
    linkedAnnouncementId?: string; // Add this
    createdAt: number;
}
interface AnnouncementDoc { id: string; title: string; }

// ----------------------------------------------------------------------------------
// Custom Components (APPLIED GLASSY STYLES)
// ----------------------------------------------------------------------------------

function BotStatusToggle({ botEnabled, toggleBot }: { botEnabled: boolean, toggleBot: () => void }) {
    return (
        <Card className="bg-black/10 backdrop-blur-lg border border-white/10 shadow-lg border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-xl text-white">iBot Status</CardTitle>
                    <CardDescription
                        className={`text-sm ${botEnabled ? "text-green-400" : "text-red-400"}`}
                    >
                        {botEnabled ? "Enabled and Active" : "Disabled (No Auto-Replies)"}
                    </CardDescription>
                </div>
                <Switch
                    id="ibot-status"
                    checked={botEnabled}
                    onCheckedChange={toggleBot}
                    className={`${botEnabled ? 'bg-green-600' : 'bg-red-600'}`}
                />
            </CardHeader>
        </Card>
    );
}

// --- Main Component ---

export default function IBot() {
    const [trigger, setTrigger] = useState("");
    const [reply, setReply] = useState("");
    const [linkedAnnouncementId, setLinkedAnnouncementId] = useState<string>("none"); 
    const [responses, setResponses] = useState<BotResponse[]>([]);
    const [announcements, setAnnouncements] = useState<AnnouncementDoc[]>([]); 
    const [editing, setEditing] = useState<BotResponse | null>(null);
    const [botEnabled, setBotEnabled] = useState(true);
    const { toast } = useToast();

    // Pagination State
    const [page, setPage] = useState(1);
    const [searchReplies, setSearchReplies] = useState("");
    const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
    const ITEMS_PER_PAGE = 5;

    const toggleReply = (id: string) => {
        setExpandedReplies(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Derived filtered and paginated responses
    const filteredResponses = responses.filter(r => 
        r.trigger.toLowerCase().includes(searchReplies.toLowerCase()) || 
        r.reply.toLowerCase().includes(searchReplies.toLowerCase())
    ).sort((a, b) => b.createdAt - a.createdAt);

    const totalPages = Math.ceil(filteredResponses.length / ITEMS_PER_PAGE);
    const paginatedResponses = filteredResponses.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);


    // ──────────────────────────────────────────────────────────
    // LOAD FIREBASE DATA
    // ──────────────────────────────────────────────────────────
    useEffect(() => {
        // Listen real-time
        const unsub = onSnapshot(collection(db, "ibot_responses"), (snap) => {
            const list: BotResponse[] = [];
            snap.forEach((d) => {
                const data = d.data();
                if (!data.isDeleted && data.status !== 'deleted') {
                    list.push({ id: d.id, ...data } as BotResponse);
                }
            });
            setResponses(list);
        });

        const loadAnnouncements = async () => {
            try {
                // Fetch directly from client SDK to avoid server-side index issues or strict filtering
                // tailored for the admin view which might need to see all valid announcements
                const { getDocs, query, orderBy, limit } = await import("firebase/firestore");
                const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
                
                const snap = await getDocs(q);
                const data = snap.docs
                    .filter(doc => doc.data().status === 'active') // Only show active ones
                    .map(doc => ({
                        id: doc.id,
                        title: doc.data().title || "Untitled Announcement",
                    }));
                setAnnouncements(data);
            } catch (e) {
                console.error("Failed to load announcements", e);
                // Fallback: try fetching without sort if index is missing
                try {
                     const { getDocs } = await import("firebase/firestore");
                     const snap = await getDocs(collection(db, "announcements"));
                     const data = snap.docs
                        .filter(doc => doc.data().status === 'active') // Only show active ones
                        .map(doc => ({
                            id: doc.id,
                            title: doc.data().title || "Untitled Announcement",
                        }));
                    setAnnouncements(data);
                } catch (e2) {
                    console.error("Fallback fetch failed", e2);
                }
            }
        };

        // Listen for Settings (Real-time)
        const unsubSettings = onSnapshot(doc(db, "settings", "ibot_settings"), (snap) => {
            if (snap.exists()) {
                setBotEnabled(snap.data().enabled ?? true);
            }
        });

        loadAnnouncements();

        return () => {
            unsub();
            unsubSettings();
        };
    }, []);

    const handleSave = async () => {
        if (!trigger || !reply) return toast({ title: "Validation Error", description: "Please fill all fields", variant: "destructive" });

        const body = { 
            trigger, 
            reply, 
            linkedAnnouncementId: linkedAnnouncementId === "none" ? null : linkedAnnouncementId 
        };

        try {
            if (editing) {
                const ref = doc(db, "ibot_responses", editing.id);
                await updateDoc(ref, body);
                setEditing(null);
                toast({ title: "Success", description: "Reply updated successfully", variant: "success" });
            } else {
                await addDoc(collection(db, "ibot_responses"), {
                    ...body,
                    createdAt: Date.now(),
                });
                toast({ title: "Success", description: "Reply added successfully", variant: "success" });
            }

            setTrigger("");
            setReply("");
            setLinkedAnnouncementId("none");
        } catch (error) {
            console.error("Error saving reply:", error);
            toast({ title: "Error", description: "Failed to save reply", variant: "destructive" });
        }
    };

    // ──────────────────────────────────────────────────────────
    // DELETE REPLY (Soft Delete)
    // ──────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        try {
            const ref = doc(db, "ibot_responses", id);
            await updateDoc(ref, {
                isDeleted: true,
                status: 'deleted',
                deletedAt: Date.now(),
            });
            toast({ title: "Deleted", description: "Reply moved to trash", variant: "default" });
        } catch (error) {
            console.error("Error deleting reply:", error);
            toast({ title: "Error", description: "Delete failed", variant: "destructive" });
        }
    };

    // ──────────────────────────────────────────────────────────
    // TOGGLE BOT ON/OFF
    // ──────────────────────────────────────────────────────────
    const toggleBot = async () => {
        const ref = doc(db, "settings", "ibot_settings");
        const newStatus = !botEnabled;

        try {
            await setDoc(ref, { enabled: newStatus }, { merge: true });
            setBotEnabled(newStatus);
            toast({
                title: newStatus ? "iBot Enabled" : "iBot Disabled",
                description: newStatus ? "Auto-replies are active" : "Auto-replies paused",
                variant: newStatus ? "success" : "warning"
            });
        } catch (error) {
            console.error("Error toggling bot status:", error);
            toast({ title: "Error", description: "Toggle failed", variant: "destructive" });
        }
    };

    // ──────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────
    return (
        // Main container with high blur and dark transparency
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 min-h-screen text-white bg-black/10 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-xl">

            {/* Page Title */}
            <h3 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 text-purple-400">
                <Bot size={32} /> iBot – Auto Chat Replies
            </h3>

            <Separator className="bg-white/20" />

            {/* 1. BOT STATUS TOGGLE (Uses Custom Glassy Component) */}
            <BotStatusToggle botEnabled={botEnabled} toggleBot={toggleBot} />

            <Separator className="bg-white/20" />

            {/* 2. Add / Edit Form (Applied Glassy Styles) */}
            <Card className="bg-black/10 backdrop-blur-lg border border-white/10 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-white">{editing ? "Edit Auto-Reply" : "Add New Auto-Reply"}</CardTitle>
                    <CardDescription className="text-gray-300">
                        Define a trigger keyword or phrase and the automated response.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Label htmlFor="trigger-input" className="text-white font-semibold">Trigger Keywords</Label>
                    <Input
                        id="trigger-input"
                        placeholder="example: hello, help"
                        value={trigger}
                        onChange={(e) => setTrigger(e.target.value)}
                        // Glassy Input Style
                        className="bg-white/5 text-white border-purple-500/50 placeholder:text-gray-500 focus-visible:ring-purple-500"
                    />

                    <Label htmlFor="reply-textarea" className="text-white font-semibold">Reply Message</Label>
                    <Textarea
                        id="reply-textarea"
                        placeholder="Reply message..."
                        rows={4}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        // Glassy Textarea Style
                        className="bg-white/5 text-white border-purple-500/50 placeholder:text-gray-500 focus-visible:ring-purple-500"
                    />

                    <Label className="text-white font-semibold mt-4 block">Attach Announcement (Optional)</Label>
                    <Select value={linkedAnnouncementId} onValueChange={setLinkedAnnouncementId}>
                        <SelectTrigger className="w-full bg-white/5 border-purple-500/50 text-white">
                            <SelectValue placeholder="Select an announcement to link..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[300px] overflow-y-auto">
                            <SelectItem value="none" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 font-medium text-amber-500">
                                -- No Attachment --
                            </SelectItem>
                            {announcements.map((ann) => (
                                <SelectItem key={ann.id} value={ann.id} className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">
                                    <span className="truncate block max-w-[300px] md:max-w-md">{ann.title}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex justify-between items-center pt-2">
                        {editing && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setEditing(null);
                                    setTrigger("");
                                    setReply("");
                                    setLinkedAnnouncementId("none");
                                    toast({ title: "Cancelled", description: "Editing cancelled" });
                                }}
                                className="text-gray-400 hover:text-white hover:bg-white/10"
                            >
                                <X className="h-4 w-4 mr-2" /> Cancel Edit
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            // Strong Button Style (Purple/Blue)
                            className={`font-bold py-2 px-5 flex items-center gap-2 ${editing ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"} ml-auto`}
                        >
                             <Send size={18} />
                            {editing ? "Save Changes" : "Add Reply"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Separator className="bg-white/20" />

            {/* 3. List of Responses (Applied Glassy Styles) */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 p-6">
                    <div>
                        <CardTitle className="text-xl text-white">Existing iBot Replies ({responses.length})</CardTitle>
                        <CardDescription className="text-zinc-400">List of all saved trigger-reply pairs.</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search triggers or replies..."
                            value={searchReplies}
                            onChange={(e) => { setSearchReplies(e.target.value); setPage(1); }}
                            className="bg-white/5 border-white/10 text-white pl-10 h-10 rounded-xl text-xs focus:ring-purple-500/50"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredResponses.length === 0 ? (
                        <div className="text-center py-20">
                            <Bot className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
                            <p className="text-zinc-500 font-medium font-outfit">No replies matching your search.</p>
                        </div>
                    ) : (
                        <>
                            {/* DESKTOP VIEW */}
                            <div className="hidden lg:block p-6 space-y-3">
                                {paginatedResponses.map((r) => {
                                    const isExpanded = expandedReplies.has(r.id);
                                    const replySummary = r.reply.substring(0, 100) + (r.reply.length > 100 ? '...' : '');

                                    return (
                                        <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all">
                                            {/* Collapsed Header */}
                                            <div 
                                                onClick={() => toggleReply(r.id)}
                                                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    {/* Chevron Icon */}
                                                    <div className="flex-shrink-0">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-5 w-5 text-purple-400" />
                                                        ) : (
                                                            <ChevronRight className="h-5 w-5 text-zinc-500" />
                                                        )}
                                                    </div>
                                                    
                                                    {/* Trigger Keyword */}
                                                    <div className="flex-shrink-0">
                                                        <div className="flex items-center gap-2">
                                                            <Bot size={18} className="text-purple-400" />
                                                            <span className="text-sm font-bold text-purple-400 break-words">{r.trigger}</span>
                                                        </div>
                                                    </div>

                                                    {/* Reply Summary - Only when collapsed */}
                                                    {!isExpanded && (
                                                        <div className="flex-1 min-w-0 px-4">
                                                            <p className="text-xs text-zinc-400 italic truncate">{replySummary}</p>
                                                        </div>
                                                    )}

                                                    {/* Metadata */}
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        {r.linkedAnnouncementId && announcements.some(a => a.id === r.linkedAnnouncementId) ? (
                                                            <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-[9px] uppercase font-black">
                                                                Linked Doc
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[10px] text-zinc-600 font-bold uppercase italic">No Link</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-6 pb-4 pt-2 space-y-3 border-t border-white/5">
                                                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">Auto-Reply Content</span>
                                                                <p className="text-sm text-zinc-300 leading-relaxed break-words">{r.reply}</p>
                                                            </div>
                                                            
                                                            {/* Action Buttons */}
                                                            <div className="flex justify-end gap-2 pt-2">
                                                                <Button
                                                                    variant="ghost" size="sm" className="text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-lg"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditing(r);
                                                                        setTrigger(r.trigger);
                                                                        setReply(r.reply);
                                                                        setLinkedAnnouncementId(r.linkedAnnouncementId || "none");
                                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                    }}
                                                                >
                                                                    <Edit size={16} className="mr-2" /> Edit
                                                                </Button>
                                                                <Button
                                                                    variant="ghost" size="sm" className="text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(r.id);
                                                                    }}
                                                                >
                                                                    <Trash2 size={16} className="mr-2" /> Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* MOBILE VIEW */}
                            <div className="lg:hidden p-4 space-y-4">
                                {paginatedResponses.map((r) => (
                                    <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 group hover:border-purple-500/30 transition-all">
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <span className="text-[9px] text-purple-400 font-black uppercase tracking-widest block">Trigger</span>
                                                <h4 className="text-sm font-bold text-white break-words">{r.trigger}</h4>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400" onClick={() => {
                                                    setEditing(r);
                                                    setTrigger(r.trigger);
                                                    setReply(r.reply);
                                                    setLinkedAnnouncementId(r.linkedAnnouncementId || "none");
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}>
                                                    <Edit size={16} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleDelete(r.id)}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="bg-black/20 p-3.5 rounded-xl border border-white/5">
                                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Reply</span>
                                            <p className="text-xs text-zinc-300 leading-relaxed break-words">{r.reply}</p>
                                        </div>

                                        {r.linkedAnnouncementId && announcements.some(a => a.id === r.linkedAnnouncementId) && (
                                            <div className="flex items-center gap-2 text-[10px] text-indigo-300 font-bold bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                                                <Bot size={12} />
                                                Linked to Attachment
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="p-6 border-t border-white/5 flex justify-center">
                                    <Pagination>
                                        <PaginationContent className="flex-wrap gap-1">
                                            <PaginationItem>
                                                <PaginationPrevious 
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); if (page > 1) setPage(p => p - 1); }}
                                                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>
                                            {(() => {
                                                const maxVisible = 3;
                                                let start = Math.max(1, page - Math.floor(maxVisible / 2));
                                                let end = Math.min(totalPages, start + maxVisible - 1);
                                                if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                                                const pages = [];
                                                for (let i = start; i <= end; i++) pages.push(i);
                                                return pages;
                                            })().map((p) => (
                                                <PaginationItem key={p}>
                                                    <PaginationLink
                                                        href="#"
                                                        onClick={(e) => { e.preventDefault(); setPage(p); }}
                                                        isActive={p === page}
                                                        className={p === page ? "bg-purple-600 border-purple-500" : ""}
                                                    >
                                                        {p}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(p => p + 1); }}
                                                    className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>



        </div>
    );
}
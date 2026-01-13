"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
// Consolidated Shadcn/Framer/Lucide Imports
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Send, X, Bot, Link as LinkIcon, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link"; // For smart navigation

import { collection, doc, onSnapshot, getDoc, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import { getAnnouncements } from "@/actions/announcements";

// Types remain concise
interface Message {
    sender: "user" | "bot";
    text: string;
    attachment?: {
        type: "announcement" | "link";
        title: string;
        url: string;
    };
}
interface BotResponse { 
    id: string; 
    trigger: string; 
    reply: string; 
    linkedAnnouncementId?: string; // New: Support linked announcement
}

// Minimal type for Announcement indexing
interface AnnouncementDoc {
    id: string;
    title: string;
    description: string;
    status?: 'active' | 'deleted' | 'disabled';
    createdAt?: any; // Allow timestamp for sorting
}

export default function IChat() {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { sender: "bot", text: "Hi! I'm iBot. How can I help you today?" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [userHasTyped, setUserHasTyped] = useState(false);
    const [announcements, setAnnouncements] = useState<AnnouncementDoc[]>([]);
    const [botEnabled, setBotEnabled] = useState(true);
    const [responses, setResponses] = useState<BotResponse[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const normalize = (text: string) => text.toLowerCase().trim();
    const tokenize = (text: string) => normalize(text).split(/\s+/);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    //  SMART RESPONSE LOGIC
    const getBotResponse = (text: string): { reply: string, attachment?: Message['attachment'] } => {
        if (!botEnabled) return { reply: "iBot is currently disabled 🟥" };

        const normalizedInput = normalize(text);
        
        // 1. Check Custom Responses first
        const customMatch = responses.find(r => 
            normalizedInput.includes(normalize(r.trigger))
        );

        if (customMatch) {
            let attachment: Message['attachment'] | undefined;
            if (customMatch.linkedAnnouncementId) {
                const ann = announcements.find(a => a.id === customMatch.linkedAnnouncementId && a.status === 'active');
                if (ann) {
                    attachment = {
                        type: "announcement",
                        title: ann.title,
                        url: `/announcement?id=${ann.id}`
                    };
                }
            }
            return { reply: customMatch.reply, attachment };
        }

        // 2. SMART CHECK: "LATEST ANNOUNCEMENTS"
        const isAnnouncementQuery = 
            (normalizedInput.includes("latest") || normalizedInput.includes("recent") || normalizedInput.includes("new") || normalizedInput.includes("what")) && 
            (normalizedInput.includes("announcement") || normalizedInput.includes("event") || normalizedInput.includes("news"));
            
        const isDirectKeyword = normalizedInput === "announcement" || normalizedInput === "announcements" || normalizedInput === "event" || normalizedInput === "events";

        if (isAnnouncementQuery || isDirectKeyword) {
             if (announcements.length > 0) {
                 const activeAnnouncements = announcements.filter(a => a.status === 'active');
                 if (activeAnnouncements.length > 0) {
                     activeAnnouncements.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (new Date(a.createdAt || 0).getTime());
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (new Date(b.createdAt || 0).getTime());
                        return dateB - dateA;
                     });

                     const latest = activeAnnouncements[0]; 
                     return {
                        reply: "Here is the latest announcement:",
                        attachment: { type: "announcement", title: latest.title, url: `/announcement?id=${latest.id}` }
                     };
                 } else {
                     return { reply: "There are no new announcements at the moment." };
                 }
             } else {
                 return { reply: "There are no announcements yet." };
             }
        }
        
        return { reply: "I'm sorry, I don't have information on that yet. Try asking about 'latest announcements'!" };
    };

    const sendMessage = async (textOverride?: string) => {
        const text = textOverride || input;
        if (!text.trim()) return;

        const userMsg: Message = { sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setUserHasTyped(true);
        setIsTyping(true);

        // Local Bot Logic
        setTimeout(() => {
            const response = getBotResponse(text);
            const botMsg: Message = { 
                sender: 'bot', 
                text: response.reply,
                attachment: response.attachment
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 600);
    };
    
    // Effect 2: Announcements & Settings
    useEffect(() => {
        // A. Listen for Responses
        const unsubResponses = onSnapshot(collection(db, "ibot_responses"), (snap) => {
            const list: BotResponse[] = [];
            snap.forEach((d) => {
                const data = d.data();
                if (!data.isDeleted && data.status !== 'deleted') {
                    list.push({ id: d.id, ...data } as BotResponse);
                }
            });
            setResponses(list);
        });

        // B. Listen for Announcements
        const unsubAnnouncements = onSnapshot(
            collection(db, "announcements"), 
            (snap) => {
                const list = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                } as AnnouncementDoc));
                setAnnouncements(list);
            },
            (error) => { console.warn("SmartBot: Real-time announcements failed", error); }
        );

        // C. Listen for Settings (Real-time)
        const unsubSettings = onSnapshot(doc(db, "settings", "ibot_settings"), (snap) => {
            if (snap.exists()) {
                setBotEnabled(snap.data().enabled ?? true);
            }
        });
        
        // Cleanup all listeners
        return () => {
             unsubResponses(); 
             unsubAnnouncements();
             unsubSettings();
        };
    }, []);



    // Effect 4: External Open Trigger
    useEffect(() => {
        const handleOpenChat = () => setIsOpen(true);
        window.addEventListener('open-ichat', handleOpenChat);
        return () => window.removeEventListener('open-ichat', handleOpenChat);
    }, []);





    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") sendMessage();
    };

    // Helper for message styling
    const isUser = (sender: string) => sender === "user";

    // ✨ DESIGN SYSTEM: Modern "Deep Glass" Aesthetic
    // Primary Gradient: Indigo to Violet (matches the "tech/AI" vibe)
    const PRIMARY_GRADIENT = "bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 shadow-lg shadow-indigo-500/20";
    const GLASS_PANEL = "bg-slate-950/95 backdrop-blur-xl border border-white/10 shadow-2xl";
    
    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4 pointer-events-none">
            {/* 1. Toggle Button (Always visible) */}
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                className="pointer-events-auto"
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <Button
                    className={`h-16 w-16 rounded-full transition-all duration-300 p-0 overflow-hidden relative group ${isOpen ? "rotate-90" : ""}`}
                    style={{ boxShadow: isOpen ? 'none' : '0 10px 40px -10px rgba(79, 70, 229, 0.5)' }} // Glow effect
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className={`absolute inset-0 ${PRIMARY_GRADIENT} transition-opacity duration-300 ${isOpen ? "opacity-0" : "opacity-100"}`} />
                    <div className={`absolute inset-0 bg-slate-900 border border-white/10 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} />
                    
                    {isOpen ? (
                        <X className="h-8 w-8 text-white relative z-10 transition-transform duration-300" />
                    ) : (
                        <Bot className="h-12 w-12 text-white relative z-10" />
                    )}
                </Button>
            </motion.div>

            {/* 2. Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="absolute bottom-24 right-0 w-[90vw] sm:w-[380px] md:w-[420px] h-[600px] max-h-[80vh] flex flex-col origin-bottom-right pointer-events-auto"
                    >
                        {/* Restored Glassy Aesthetic: Slate tint with heavy backdrop-blur */}
                        <Card className="flex flex-col h-full rounded-2xl overflow-hidden bg-slate-950/90 backdrop-blur-2xl border border-white/10 shadow-2xl">
                            
                            {/* Header - Transparent to allow seamless fading */}
                            <div className="flex items-center justify-between px-5 py-6 bg-transparent relative z-20">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${PRIMARY_GRADIENT} relative shadow-xl shadow-indigo-500/30`}>
                                        <Bot className="h-6 w-6 text-white" />
                                        <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm animate-pulse" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-white text-base tracking-tight">iChat AI</h2>
                                        <p className={`text-xs font-medium flex items-center gap-1.5 ${botEnabled ? "text-indigo-300/80" : "text-red-400"}`}>
                                            <span className="relative flex h-2 w-2">
                                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${botEnabled ? "bg-green-400" : "bg-red-400"}`}></span>
                                              <span className={`relative inline-flex rounded-full h-2 w-2 ${botEnabled ? "bg-green-500" : "bg-red-500"}`}></span>
                                            </span>
                                            {botEnabled ? "Online & Ready" : "Currently Disabled"}
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-white/50 hover:text-white hover:bg-white/10 rounded-full h-8 w-8" 
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Messages Area - Gradient Fade to remove 'sharp' cutting */}
                            <CardContent className="flex-grow p-0 overflow-hidden relative">
                                <ScrollArea 
                                    className="h-full px-5 py-2"
                                    style={{
                                        maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
                                        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
                                    }}
                                >
                                    <div className="space-y-6 pb-4">
                                        {messages.map((msg, i) => (
                                            <motion.div
                                                key={i}
                                                layout
                                                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                className={`flex w-full mb-4 ${isUser(msg.sender) ? "justify-end" : "justify-start"}`}
                                            >
                                                <div className={`flex flex-col max-w-[85%] ${isUser(msg.sender) ? "items-end" : "items-start"}`}>
                                                    
                                                    {/* Sender Label */}
                                                    <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 px-1 ${isUser(msg.sender) ? "text-indigo-400" : "text-gray-500"}`}>
                                                        {isUser(msg.sender) ? "You" : "iBot"}
                                                    </span>

                                                    {/* Bubble - Removed border for a more organic feel */}
                                                    <div className={`px-4 py-2.5 text-sm leading-relaxed relative group break-words min-w-[40px] shadow-2xl
                                                        ${isUser(msg.sender)
                                                            ? `${PRIMARY_GRADIENT} text-white rounded-[1.25rem] rounded-tr-none shadow-indigo-500/20` 
                                                            : "bg-white/10 text-zinc-100 rounded-[1.25rem] rounded-tl-none backdrop-blur-md shadow-black/40"
                                                        }
                                                    `}>
                                                        {msg.text}
                                                    </div>

                                                    {/* Attachment - Use shadow instead of border for glass depth */}
                                                    {msg.attachment && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="mt-3 w-full"
                                                        >
                                                            <Link href={msg.attachment.url} className="block group w-full no-underline" prefetch={false}>
                                                                <div className="relative overflow-hidden rounded-2xl bg-white/[0.06] p-4 transition-all duration-300 hover:bg-white/[0.1] shadow-xl shadow-black/20 active:scale-[0.98]">
                                                                    {/* Subtle Glow Overlay */}
                                                                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    
                                                                    <div className="flex items-center gap-4 relative z-10">
                                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                                                                            {msg.attachment.type === 'announcement' ? <FileText size={20} className="transition-transform group-hover:scale-110" /> : <LinkIcon size={20} className="transition-transform group-hover:scale-110" />}
                                                                        </div>
                                                                        
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/80 group-hover:text-indigo-300 transition-colors">
                                                                                    {msg.attachment.type}
                                                                                </span>
                                                                                <div className="h-1 w-1 rounded-full bg-white/20" />
                                                                                <span className="text-[10px] font-bold text-white/30 group-hover:text-white/50 transition-colors">
                                                                                    Click to view
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-indigo-50 transition-colors">
                                                                                {msg.attachment.title}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}

                                        {/* Typing Indicator */}
                                        {isTyping && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="flex w-full justify-start mb-4"
                                            >
                                                <div className="bg-white/10 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm backdrop-blur-sm flex items-center gap-1.5 shadow-sm">
                                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Preset Suggestions (Persist until user types manually) */}
                                        {!userHasTyped && (
                                            <motion.div 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.5 }}
                                                className="grid grid-cols-1 gap-2 mt-2 px-1"
                                            >
                                                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black mb-2 pl-2">Quick Actions</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        "📢 Latest Announcements",
                                                        "📅 School Events",
                                                    ].map((text, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => { setUserHasTyped(true); sendMessage(text); }}
                                                            disabled={isTyping || !botEnabled}
                                                            className={`text-[11px] font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-full px-4 py-2 transition-all active:scale-[0.95] ${(isTyping || !botEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {text}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                            </CardContent>

                            {/* Input Footer - Transparent with no sharp lines */}
                            <CardFooter className="p-4 bg-transparent relative z-20">
                                <div className="flex items-end gap-2 w-full bg-white/[0.03] p-1.5 rounded-[1.5rem] border border-white/5 focus-within:bg-white/[0.07] focus-within:border-indigo-500/30 transition-all shadow-2xl">
                                    
                                    <Input
                                        className="flex-grow bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-gray-500 h-9 py-2 px-1"
                                        placeholder={botEnabled ? "Ask a question..." : "iBot is disabled (Replies paused)"}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        autoComplete="off"
                                        disabled={!botEnabled}
                                    />

                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button
                                            size="icon"
                                            className={`h-9 w-9 rounded-full shrink-0 transition-all ${(input.trim() && botEnabled) ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-white/10 text-gray-500 cursor-not-allowed"}`}
                                            onClick={() => { setUserHasTyped(true); sendMessage(); }}
                                            disabled={!input.trim() || !botEnabled}
                                        >
                                            <Send className="h-4 w-4 ml-0.5" />
                                        </Button>
                                    </motion.div>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
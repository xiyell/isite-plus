"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
// Consolidated Shadcn/Framer/Lucide Imports
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Send, X, Mic, Bot, Link as LinkIcon, FileText } from "lucide-react";
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
    const [isListening, setIsListening] = useState(false);
    const [userHasTyped, setUserHasTyped] = useState(false);
    const [announcements, setAnnouncements] = useState<AnnouncementDoc[]>([]);
    const [botEnabled, setBotEnabled] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

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
        const inputTokens = tokenize(text);
        
        // 0. QUICK CHECK: "LATEST"
        if ((normalizedInput.includes("latest") || normalizedInput.includes("recent")) && 
            (normalizedInput.includes("announcement") || normalizedInput.includes("event") || normalizedInput.includes("news"))) {
             if (announcements.length > 0) {
                 // FILTER: Only show active announcements
                 const activeAnnouncements = announcements.filter(a => a.status === 'active');
                 
                 if (activeAnnouncements.length > 0) {
                     // SORT: Ensure we get the actual latest (Client-side sort to avoid index requirements)
                     activeAnnouncements.sort((a, b) => {
                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (new Date(a.createdAt || 0).getTime());
                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (new Date(b.createdAt || 0).getTime());
                        return dateB - dateA; // Descending
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
        // B. Listen for Announcements
        const unsubAnnouncements = onSnapshot(
            collection(db, "announcements"), 
            (snap) => {
                const list = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                } as AnnouncementDoc));
                // We'll trust the component state to sort when needed or we can sort here if we want list consistency
                setAnnouncements(list);
            },
            (error) => { console.warn("SmartBot: Real-time announcements failed", error); }
        );

        const loadSettings = async () => {
            const snap = await getDoc(doc(db, "settings", "ibot_settings"));
            if (snap.exists()) setBotEnabled(snap.data().enabled);
        };

        loadSettings();
        
        // Cleanup all listeners
        return () => {
             // unsubResponses(); 
             unsubAnnouncements();
        };
    }, []);

    // Effect 3: Voice setup
    useEffect(() => {
        if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const recognition = new SpeechRecognition();

            recognition.lang = "en-PH"; // Optimize for Filipino accents
            recognition.interimResults = true; // Show text while speaking
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (e: any) => {
                const result = e.results[e.resultIndex];
                const transcript = result[0].transcript;

                if (result.isFinal) {
                    sendMessage(transcript);
                } else {
                    setInput(transcript); // Show real-time preview
                }
            };

            recognitionRef.current = recognition;
        }
    }, []);

    // Effect 4: External Open Trigger
    useEffect(() => {
        const handleOpenChat = () => setIsOpen(true);
        window.addEventListener('open-ichat', handleOpenChat);
        return () => window.removeEventListener('open-ichat', handleOpenChat);
    }, []);

    const startListening = () => {
        if (recognitionRef.current) recognitionRef.current.start();
        else toast({
            title: "Not Supported",
            description: "Your browser does not support voice recognition 😢",
            variant: "destructive",
        });
    };



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
        <div className="fixed bottom-6 right-6 z-[9999] font-sans">
            {/* 1. Toggle Button (Floating Orb) */}
            <motion.div
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
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
                        initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                        className="absolute bottom-24 right-0 w-[90vw] sm:w-[380px] md:w-[420px] h-[600px] max-h-[80vh] flex flex-col origin-bottom-right"
                    >
                        <Card className={`flex flex-col h-full rounded-2xl overflow-hidden ${GLASS_PANEL} border-0 ring-1 ring-white/10`}>
                            
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${PRIMARY_GRADIENT}`}>
                                        <Bot className="h-8 w-8 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-white text-base tracking-tight">iChat AI</h2>
                                        <p className="text-xs text-indigo-300/80 font-medium flex items-center gap-1.5">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            Online & Ready
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

                            {/* Messages Area */}
                            <CardContent className="flex-grow p-0 overflow-hidden relative">
                                <ScrollArea className="h-full px-5 py-6">
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

                                                    {/* Bubble */}
                                                    <div className={`px-4 py-3 text-sm leading-relaxed shadow-sm relative group break-words min-w-[60px]
                                                        ${isUser(msg.sender)
                                                            ? `${PRIMARY_GRADIENT} text-white rounded-2xl rounded-tr-sm` 
                                                            : "bg-white/10 border border-white/5 text-gray-100 rounded-2xl rounded-tl-sm backdrop-blur-sm shadow-black/20"
                                                        }
                                                    `}>
                                                        {msg.text}
                                                    </div>

                                                    {/* Attachment */}
                                                    {msg.attachment && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            className="mt-2 w-full max-w-full"
                                                        >
                                                            <Link href={msg.attachment.url} className="block group/link w-full text-decoration-none" prefetch={false}>
                                                                <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-900/50 border border-indigo-500/30 hover:bg-indigo-800/60 hover:border-indigo-400 transition-all cursor-pointer shadow-md">
                                                                    <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover/link:text-indigo-200 transition-colors mt-0.5">
                                                                        {msg.attachment.type === 'announcement' ? <FileText size={20} /> : <LinkIcon size={20} />}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-0.5">
                                                                            {msg.attachment.type}
                                                                        </p>
                                                                        <p className="text-sm font-semibold text-white group-hover/link:text-indigo-100 transition-colors break-words leading-snug">
                                                                            {msg.attachment.title}
                                                                        </p>
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
                                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1 pl-1">Suggested</p>
                                                {[
                                                    "📢 Latest Announcements",
                                                    "📅 School Events",
                                                ].map((text, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => { setUserHasTyped(true); sendMessage(text); }}
                                                        disabled={isTyping}
                                                        className={`text-left text-xs text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl px-4 py-3 transition-all active:scale-[0.98] flex items-center justify-between group ${isTyping ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {text}
                                                        <Send className="h-3 w-3 opacity-0 group-hover:opacity-50 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-400" />
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
                            </CardContent>

                            {/* Input Footer */}
                            <CardFooter className="p-4 bg-transparent border-t border-white/5 backdrop-blur-md">
                                <div className="flex items-end gap-2 w-full bg-black/40 p-1.5 rounded-3xl border border-white/10 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                                    
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className={`h-9 w-9 rounded-full shrink-0 transition-colors ${isListening ? "text-red-400 bg-red-400/10 hover:bg-red-400/20" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                                        onClick={startListening}
                                    >
                                        <Mic className={`h-4 w-4 ${isListening ? "animate-pulse" : ""}`} />
                                    </Button>

                                    <Input
                                        className="flex-grow bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-gray-500 h-9 py-2 px-1"
                                        placeholder="Ask a question..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        autoComplete="off"
                                    />

                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button
                                            size="icon"
                                            className={`h-9 w-9 rounded-full shrink-0 transition-all ${input.trim() ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-white/10 text-gray-500 cursor-not-allowed"}`}
                                            onClick={() => { setUserHasTyped(true); sendMessage(); }}
                                            disabled={!input.trim()}
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
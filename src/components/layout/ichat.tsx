"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
// Consolidated Shadcn/Framer/Lucide Imports
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Send, X, Mic, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { collection, doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

// Types remain concise
interface Message { sender: "user" | "bot"; text: string; }
interface BotResponse { id: string; trigger: string; reply: string; }

export default function IChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { sender: "bot", text: "Hi there 👋, how can I help you today?" },
    ]);
    const [input, setInput] = useState("");
    const [botEnabled, setBotEnabled] = useState(true);
    const [responses, setResponses] = useState<BotResponse[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);

    const getBotResponse = (text: string) => {
        if (!botEnabled) return "iBot is currently disabled 🟥";
        const lower = text.toLowerCase();

        for (const r of responses) {
            const keywords = r.trigger.split(",").map((k) => k.trim().toLowerCase());
            if (keywords.some((k) => lower.includes(k))) return r.reply;
        }
        return "Hmm 🤔 I don't know that yet, but I'm learning!";
    };

    const sendMessage = (customText?: string) => {
        const text = customText || input;
        if (!text.trim()) return;

        const userMsg: Message = { sender: "user", text };
        const botReply: Message = { sender: "bot", text: getBotResponse(text) };

        setMessages((prev) => [...prev, userMsg, botReply]);
        setInput("");
    };

    // Effect 1: Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Effect 2: Load data/settings
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "ibot_responses"), (snap) => {
            const list: BotResponse[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<BotResponse, 'id'>) }));
            setResponses(list);
        });

        const loadSettings = async () => {
            const snap = await getDoc(doc(db, "settings", "ibot_settings"));
            if (snap.exists()) setBotEnabled(snap.data().enabled);
        };

        loadSettings();
        return () => unsub();
    }, []);

    // Effect 3: Voice setup
    useEffect(() => {
        if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const recognition = new SpeechRecognition();

            recognition.lang = "en-US";
            recognition.interimResults = false;
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (e: any) => sendMessage(e.results[0][0].transcript);

            recognitionRef.current = recognition;
        }
    }, []);

    const startListening = () => {
        if (recognitionRef.current) recognitionRef.current.start();
        else alert("Your browser does not support voice recognition 😢");
    };



    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") sendMessage();
    };

    // Condensed Style Definitions
    const isUser = (sender: string) => sender === "user";

    // ✨ IMPROVEMENT: Simplify Pulse animation and move it to the button only when closed
    const botIconPulse = (
        <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [1, 0.9, 1] }}
            className="rounded-full"
            transition={{ duration: 3, repeat: Infinity }}>
            <Bot className="h-7 w-7 text-white" />
        </motion.div>
    );

    // ✨ IMPROVEMENT: Reduced blur, higher border contrast for better definition
    const chatWindowClasses = `rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px] 
        bg-white/10 backdrop-blur-lg border border-white/40`;

    // ✨ IMPROVEMENT: More transparent header with its own blur layer for a distinct glass look
    const chatHeaderClasses = `flex flex-row items-center justify-between space-y-0 p-4 bg-fuchsia-900/40 text-white 
        border-b border-white/40 backdrop-blur-md`;

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            {/* 1. Toggle Button */}
            <motion.div
                animate={{ scale: 1 }} initial={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}>
                <Button
                    // ✨ IMPROVEMENT: Use a solid fuchsia when closed for high contrast. Removed extra blur layer.
                    className={`h-16 w-16 rounded-full shadow-xl transition-all p-0 
                        ${isOpen ? "bg-fuchsia-800/80 border-fuchsia-700 hover:bg-fuchsia-900/80"
                            : "bg-fuchsia-600 border-fuchsia-500 hover:bg-fuchsia-700"}`}
                    size="icon" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X className="h-6 w-6 text-white" /> : botIconPulse}
                </Button>
            </motion.div>

            {/* 2. Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="absolute bottom-20 right-0 w-80 md:w-[480px] z-50"
                        exit={{ opacity: 0, y: 30, scale: 0.9 }}
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}>

                        <Card className={chatWindowClasses}>
                            {/* Header */}
                            <CardHeader className={chatHeaderClasses}>
                                <div className="flex items-center gap-2">
                                    <Bot className="h-5 w-5 text-fuchsia-300" />
                                    <h2 className="font-semibold text-lg">iChat Assistant</h2>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-white hover:bg-fuchsia-700/50" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>

                            {/* Messages Content */}
                            <CardContent className="flex-grow p-4 bg-transparent min-h-0">
                                <ScrollArea className="h-full">
                                    <div className="space-y-3 pr-2">
                                        <AnimatePresence initial={false}>
                                            {messages.map((msg, i) => (
                                                <motion.div
                                                    key={i} animate={{ opacity: 1, y: 0 }}
                                                    className={`flex ${isUser(msg.sender) ? "justify-end" : "justify-start"}`}
                                                    initial={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                                                    <div
                                                        className={`max-w-[75%] px-4 py-2 text-base shadow-lg 
                                                            ${isUser(msg.sender)
                                                                // ✨ IMPROVEMENT: Larger radius, with a smaller connecting corner
                                                                ? "bg-fuchsia-700/90 text-white rounded-3xl rounded-br-lg"
                                                                // ✨ IMPROVEMENT: Higher opacity on white background for contrast
                                                                : "bg-white/75 text-gray-900 border border-white/50 rounded-3xl rounded-tl-lg"
                                                            }`}>
                                                        {msg.text}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <ScrollBar orientation="vertical" />
                                </ScrollArea>
                            </CardContent>

                            {/* Input Area */}
                            {/* ✨ IMPROVEMENT: Slightly softer input area background */}
                            <CardFooter className="flex items-center gap-2 p-3 border-t border-white/30 bg-white/20 backdrop-blur-sm">
                                <Input
                                    // ✨ IMPROVEMENT: Higher opacity for better legibility on input
                                    className="flex-grow bg-white/70 text-gray-900 placeholder:text-gray-600 border border-white/50 focus-visible:ring-fuchsia-500 focus-visible:bg-white"
                                    placeholder="Type a message or use voice..." value={input}
                                    onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                                />

                                <Button // Voice Button
                                    size="icon"
                                    className={`rounded-full h-10 w-10 shadow-lg transition-colors 
                                        ${isListening ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-fuchsia-700 hover:bg-fuchsia-800"}`}
                                    onClick={startListening}>
                                    <Mic className="h-4 w-4 text-white" />
                                </Button>

                                <Button // Send Button
                                    size="icon"
                                    className="rounded-full h-10 w-10 bg-fuchsia-700 hover:bg-fuchsia-800 shadow-lg transition-colors"
                                    onClick={() => sendMessage()} disabled={!input.trim()}>
                                    <Send className="h-4 w-4 text-white" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
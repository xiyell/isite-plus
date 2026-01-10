'use client';

import { useToast } from "@/components/ui/use-toast";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label"; // Added Label for better form styling

// Third-party imports
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Edit, Bot, X, Check } from "lucide-react";

// Firebase imports (already correct)
import {
    onSnapshot,
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
} from "firebase/firestore";
import { db } from "@/services/firebase";

// --- Types ---
interface BotResponse {
    id: string;
    trigger: string;
    reply: string;
    createdAt: number;
}

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
    const [responses, setResponses] = useState<BotResponse[]>([]);
    const [editing, setEditing] = useState<BotResponse | null>(null);
    const [botEnabled, setBotEnabled] = useState(true);
    const { toast } = useToast();


    // ──────────────────────────────────────────────────────────
    // LOAD FIREBASE DATA (Real-time listener)
    // ──────────────────────────────────────────────────────────
    useEffect(() => {
        // Listen real-time for all responses (Logic omitted for brevity)
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

        // Load bot settings (Logic omitted for brevity)
        const loadSettings = async () => { /* ... */ };
        loadSettings();

        return () => unsub();
    }, []);

    // ──────────────────────────────────────────────────────────
    // SAVE (Add or Edit)
    // ──────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!trigger || !reply) return toast({ title: "Validation Error", description: "Please fill all fields", variant: "destructive" });

        const body = { trigger, reply };

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
            toast({ title: "Error", description: "Together failed", variant: "destructive" });
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

                    <div className="flex justify-between items-center pt-2">
                        {editing && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setEditing(null);
                                    setTrigger("");
                                    setReply("");
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
            <Card className="bg-black/10 backdrop-blur-lg border border-white/10 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-white">Existing iBot Replies ({responses.length})</CardTitle>
                    <CardDescription className="text-gray-300">List of all saved trigger-reply pairs, ordered by creation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {responses.length === 0 && (
                        <p className="text-gray-400 py-4 text-center">
                            <Bot className="inline h-5 w-5 mr-2" /> No automated responses have been added yet.
                        </p>
                    )}

                    {responses.map((r) => (
                        <motion.div
                            key={r.id}
                            // Glassy List Item Style
                            className="p-4 border border-white/15 bg-black/5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center transition-shadow hover:shadow-lg hover:shadow-purple-500/10"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex-1 space-y-1 mb-3 sm:mb-0">
                                <p className="text-sm font-semibold text-purple-400 uppercase">Trigger:</p>
                                <p className="text-white mb-2 whitespace-pre-wrap">{r.trigger}</p>

                                <p className="text-sm font-semibold text-purple-400 uppercase">Reply:</p>
                                <p className="text-gray-300 whitespace-pre-wrap">{r.reply}</p>
                            </div>

                            <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-blue-500 border-blue-500/50 hover:bg-blue-500/10 w-1/2 sm:w-8"
                                    onClick={() => {
                                        setEditing(r);
                                        setTrigger(r.trigger);
                                        setReply(r.reply);
                                        toast({ title: "Editing Mode", description: `Editing: ${r.trigger}` });
                                    }}
                                >
                                    <Edit size={18} />
                                </Button>

                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="w-1/2 sm:w-8"
                                    onClick={() => handleDelete(r.id)}
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </CardContent>
            </Card>



        </div>
    );
}
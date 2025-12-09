"use client";

import { useState, useEffect } from "react";
// Assuming @heroui/button is the Button your form uses (aliased here)
import { motion, AnimatePresence } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Loader2 } from "lucide-react"; // Import a loading icon

import { auth } from "@/services/firebase";

// --- Shadcn UI Components ---
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button"; // Use the standard button alias for the trigger
// Using shadcn's Card structure for a cleaner container
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input"; // Using shadcn input component
import { Label } from "@/components/ui/label";
// ----------------------------


interface LoginModalProps {
    onLogin: (user: any) => void;
}

export default function LoginModal({ onLogin }: LoginModalProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // Renamed 'loading' to 'isSubmitting' for clarity in the form context
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Auto-hide toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        setToast(null);

        if (!email.endsWith("@iskolarngbayan.pup.edu.ph")) {
            return setToast("Only PUP Webmail accounts are allowed.");
        }

        if (!email.trim() || !password.trim()) {
            return setToast("Please fill in all fields.");
        }

        setIsSubmitting(true);
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password,
            );
            const user = userCredential.user;

            if (!user.emailVerified) {
                setToast("Please verify your email before logging in.");
                await auth.signOut();
                setIsSubmitting(false);
                return;
            }

            onLogin({
                displayName: user.displayName || user.email?.split("@")[0],
                email: user.email,
                uid: user.uid,
                role: "user",
            });

            setToast("✅ Logged in successfully!");

            setTimeout(() => {
                setIsDialogOpen(false);
            }, 2500);

        } catch (err: any) {
            let errorMessage = err.message;
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                errorMessage = 'Invalid email or password.';
            }
            setToast(errorMessage);
        } finally {
            // Only stop loading if it wasn't a success toast (success toast handles its own closing)
            if (!toast?.startsWith('✅')) {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            {/* DIALOG TRIGGER (The button on the Navbar) */}
            <DialogTrigger asChild>
                <Button
                    className="text-sm text-fuchsia-200 border border-fuchsia-500/50 hover:bg-fuchsia-600/20 transition-colors"
                    variant="outline"
                >
                    Login
                </Button>
            </DialogTrigger>

            {/* DIALOG CONTENT (The modal box) */}
            <DialogContent
                className="sm:max-w-[420px] w-[90%] p-0 bg-transparent border-none" // 🚀 MODIFIED: Added w-[90%] for better mobile sizing
            >

                <Card className="border border-fuchsia-500/30 bg-fuchsia-950/70 backdrop-blur-xl shadow-2xl relative">
                    <CardHeader className="text-center pt-8 pb-4">
                        <CardTitle className="text-3xl font-extrabold text-fuchsia-400 tracking-wider">
                            iSITE<span className="text-white">+</span> LOGIN
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-2">

                        <form onSubmit={handleLogin} className="space-y-6">

                            {/* Email Field */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-semibold text-fuchsia-200">
                                    PUP Webmail
                                </Label>
                                <Input
                                    id="email"
                                    placeholder="isitemember@iskolarngbayan.pup.edu.ph"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-semibold text-fuchsia-200">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    placeholder="Enter your password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Error/Success Toast Message */}
                            <AnimatePresence>
                                {toast && (
                                    <motion.div
                                        key="toast-in-card"
                                        animate={{ opacity: 1, y: 0 }} // 🚀 MODIFIED: Simply animate opacity and y
                                        initial={{ opacity: 0, y: 10 }} // Start slightly below
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg text-center ${toast.startsWith("✅")
                                            ? "bg-green-600/90 text-white"
                                            : "bg-red-600/90 text-white"
                                            } transition-all duration-300`}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {toast}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Buttons */}
                            <div className="flex justify-between space-x-3 pt-2">
                                <Button
                                    className="w-full bg-fuchsia-700 text-white font-semibold rounded-xl hover:bg-fuchsia-600 transition-all"
                                    disabled={isSubmitting}
                                    type="submit"
                                >
                                    {isSubmitting ? (
                                        // 🚀 ADDED: Loading spinner and text
                                        <span className="flex items-center justify-center">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Logging In...
                                        </span>
                                    ) : (
                                        "Log in"
                                    )}
                                </Button>


                            </div>

                            {/* Optional: Add a link for registration/forgot password */}
                            <div className="text-center text-xs pt-1 pb-4">
                                <a href="#" className="text-fuchsia-300 hover:text-fuchsia-100 transition-colors">
                                    Forgot Password?
                                </a>
                            </div>

                        </form>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
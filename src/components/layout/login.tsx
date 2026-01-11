"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
// Assuming @heroui/button is the Button your form uses (aliased here)
import { motion, AnimatePresence } from "framer-motion";
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { Loader2, MailWarning } from "lucide-react"; // Import a loading icon

import { auth } from "@/services/firebase";
import { User } from "@/types/user";
import { sendVerificationCode, verifyTwoFactorCode } from "@/actions/auth"; // Import actions

// --- Shadcn UI Components ---
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/Button"; // Use the standard button alias for the trigger
// Using shadcn's Card structure for a cleaner container
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input"; // Using shadcn input component
import { Label } from "@/components/ui/label";
// ----------------------------


import { useToast } from "@/components/ui/use-toast";

interface LoginModalProps {
    onLogin: (user: User) => void;
}

export default function LoginModal({ onLogin }: LoginModalProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // Renamed 'loading' to 'isSubmitting' for clarity in the form context
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // 2FA State
    const [step, setStep] = useState<'credentials' | 'verification' | 'unverified'>('credentials');
    const [verificationCode, setVerificationCode] = useState("");
    const [tempUser, setTempUser] = useState<any>(null); // Store user data temporarily between steps

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
         // Reset check
        if(step === 'unverified' && tempUser) {
            signOut(auth);
        }
        setStep('credentials');
        setTempUser(null);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.endsWith("@iskolarngbayan.pup.edu.ph")) {
            return toast({
                variant: "destructive",
                title: "Invalid Email",
                description: "Only PUP Webmail accounts are allowed."
            });
        }

        if (!email.trim() || !password.trim()) {
            return toast({
                variant: "destructive",
                title: "Missing Fields",
                 description: "Please fill in all fields."
            });
        }

        setIsSubmitting(true);
        try {
            // 1. Authenticate with Firebase (Just to check credentials)
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                // Don't sign out yet, let them resend email
                setTempUser(user);
                setStep('unverified');
                setIsSubmitting(false);
                return;
            }

            // ⚠️ IMMEDIATE SIGN OUT to prevent global app login state 
            // until 2FA is passed.
            await auth.signOut();

            // 2. Prepare for 2FA
            setTempUser(user);

            // 3. Send Verification Code
            const vResult = await sendVerificationCode(user.email!, user.uid);

            if (!vResult.success) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: vResult.message || "Failed to send code."
                });
                setIsSubmitting(false);
                return;
            }

            // 4. Move to Verification Step
            setStep('verification');
            
            // If the server returned a warning message (e.g., email failed but code logged), show it.
            if (vResult.message) {
                 toast({
                    title: "Notice",
                    description: vResult.message,
                });
            }
            
            setIsSubmitting(false);

        } catch (err: any) {
            let errorMessage = err.message;
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password.';
            } else if (err.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            }
            
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: errorMessage
            });
            setIsSubmitting(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verificationCode || !tempUser) return;
        
        setIsSubmitting(true);

        try {
            // 1. Verify Code
            const result = await verifyTwoFactorCode(tempUser.uid, verificationCode);
            
            if (!result.success) {
                toast({
                    variant: "destructive",
                    title: "Verification Failed",
                    description: result.message || "Invalid code."
                });
                setIsSubmitting(false);
                return;
            }

            // 2. Finalize Login (Re-authenticate to establish session)
            // We reuse the 'email' and 'password' from state which are still available
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const token = await user.getIdToken();

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
                credentials: "include"
            });

            const data = await res.json();

            // 3. Update Global State
            onLogin({
                name: user.displayName || user.email?.split("@")[0],
                email: user.email || undefined,
                uid: user.uid,
                role: data.role || "user",
            });

            toast({
                title: "Login Successful",
                description: "Complete!",
                className: "bg-green-600 border-green-700 text-white"
            });

            setTimeout(() => {
                setIsDialogOpen(false);
                router.push("/")
                // Reset State
                setTimeout(() => {
                    setStep('credentials');
                    setEmail("");
                    setPassword("");
                    setVerificationCode("");
                    setTempUser(null);
                }, 500);
            }, 1000);

        } catch (error) {
            console.error(error);
             toast({
                variant: "destructive",
                title: "System Error",
                description: "An error occurred during verification."
            });
            setIsSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        if (!tempUser) return;
        setIsSubmitting(true);
        try {
            await sendEmailVerification(tempUser);
            toast({
                title: "Email Sent",
                description: "✅ Verification email sent! Check Inbox/Spam.",
                className: "bg-green-600 border-green-700 text-white"
            });
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/too-many-requests') {
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Too many requests. Please wait a moment."
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to send email. Try again later."
                });
            }
        } finally {
            setIsSubmitting(false);
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
                <VisuallyHidden><DialogTitle>Login Modal</DialogTitle></VisuallyHidden>

                <Card className="border border-fuchsia-500/30 bg-fuchsia-950/70 backdrop-blur-xl shadow-2xl relative">
                    <CardHeader className="text-center pt-8 pb-4">
                        <CardTitle className="text-3xl font-extrabold text-fuchsia-400 tracking-wider">
                            iSITE<span className="text-white">+</span> LOGIN
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-2">

                        <div className="min-h-[300px]"> {/* Fixed height container to prevent jumping */}
                            {step === 'credentials' && (
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

                                    {/* Buttons */}
                                    <div className="flex justify-between space-x-3 pt-2">
                                        <Button
                                            className="w-full bg-fuchsia-700 text-white font-semibold rounded-xl hover:bg-fuchsia-600 transition-all"
                                            disabled={isSubmitting}
                                            type="submit"
                                        >
                                            {isSubmitting ? (
                                                <span className="flex items-center justify-center">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Logging In...
                                                </span>
                                            ) : (
                                                "Log in"
                                            )}
                                        </Button>
                                    </div>
                                    
                                     {/* Forgot Password */}
                                    <div className="text-center text-xs pt-1 pb-4">
                                        <a href="#" className="text-fuchsia-300 hover:text-fuchsia-100 transition-colors">
                                            Forgot Password?
                                        </a>
                                    </div>
                                </form>
                            )}

                            {step === 'unverified' && (
                                <div className="space-y-6 pt-4 text-center pb-6">
                                    <div className="mx-auto w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                        <MailWarning className="h-8 w-8 text-yellow-400" />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-bold text-white">Email Not Verified</h3>
                                        <p className="text-sm text-fuchsia-200 px-4">
                                            You must verify your email address <strong>{email}</strong> before accessing your account.
                                        </p>
                                        <p className="text-xs text-yellow-200/80 italic">
                                            (Please check your Inbox, Spam, or Junk folder)
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3 px-2">
                                        <Button
                                            onClick={handleResendVerification}
                                            className="w-full bg-fuchsia-700 hover:bg-fuchsia-600 text-white"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                                            Resend Verification Email
                                        </Button>
                                        
                                        <Button
                                            variant="ghost"
                                            onClick={handleCloseDialog}
                                            className="w-full text-fuchsia-300 hover:bg-white/5"
                                        >
                                            Back to Login
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 'verification' && (
                                <form onSubmit={handleVerify} className="space-y-6 pt-4">
                                     <div className="text-center space-y-2">
                                        <h3 className="text-lg font-semibold text-white">Verification Required</h3>
                                        <p className="text-xs text-fuchsia-200">
                                            We sent a code to <span className="font-mono text-fuchsia-100">{email}</span>
                                        </p>
                                     </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="code" className="text-sm font-semibold text-fuchsia-200">
                                            Enter 6-Digit Code
                                        </Label>
                                        <Input
                                            id="code"
                                            placeholder="123456"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60 text-center text-2xl tracking-widest"
                                            required
                                            disabled={isSubmitting}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex justify-between space-x-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost" 
                                            className="text-fuchsia-300 hover:text-white hover:bg-white/10"
                                            onClick={() => setStep('credentials')}
                                            disabled={isSubmitting}
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            className="flex-1 bg-fuchsia-700 text-white font-semibold rounded-xl hover:bg-fuchsia-600 transition-all"
                                            disabled={isSubmitting}
                                            type="submit"
                                        >
                                            {isSubmitting ? (
                                                <span className="flex items-center justify-center">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Verifying...
                                                </span>
                                            ) : (
                                                "Verify Code"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
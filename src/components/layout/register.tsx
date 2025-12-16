"use client";

import { useState, useEffect } from "react";
// Assuming @heroui/button is the Button your form uses (aliased here)
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { Loader2 } from "lucide-react";

import { handleSignup } from "@/services/auth";
import { auth } from "@/services/firebase";
import { User } from "@/types/user";

// --- Shadcn UI Components ---
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// ----------------------------


export interface RegisterModalProps {
    onRegister?: (user: User) => void;
}

export default function RegisterModal({ onRegister }: RegisterModalProps) {
    const [email, setEmail] = useState("");
    const [student_id, setStudentId] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null); // New state for password complexity feedback
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        // Reset form state on close
        setEmail("");
        setStudentId("");
        setPassword("");
        setConfirmPassword("");
        setError(null);
        setPasswordError(null);
        setIsSubmitting(false);
    };

    const studentIdPattern = /^\d{4}-\d{5}-SM-\d$/;

    const [matchError, setMatchError] = useState<boolean>(false); // New state for mismatch feedback

    useEffect(() => {
        if (confirmPassword && password !== confirmPassword) {
            setMatchError(true);
        } else {
            setMatchError(false);
        }
    }, [password, confirmPassword]);

    /**
     * Client-side validation for strong password requirements.
     */
    const validatePassword = (pass: string): boolean => {
        const errors = [];

        if (pass.length < 8) {
            errors.push("at least 8 characters");
        }
        if (!/[A-Z]/.test(pass)) {
            errors.push("one uppercase letter");
        }
        if (!/[a-z]/.test(pass)) {
            errors.push("one lowercase letter");
        }
        if (!/[0-9]/.test(pass)) {
            errors.push("one digit");
        }
        // Broader special character check: Any character that is NOT a letter or number
        if (!/[^A-Za-z0-9]/.test(pass)) {
            errors.push("one special character");
        }

        if (errors.length > 0) {
            setPasswordError(`Password requires: ${errors.join(', ')}.`);
            return false;
        }

        setPasswordError(null);
        return true;
    };

    // Update password validation feedback whenever the password changes
    useEffect(() => {
        if (password) {
            validatePassword(password);
        } else {
            setPasswordError(null);
        }
    }, [password]);


    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // --- Validation Checks ---
        if (!email.endsWith("@iskolarngbayan.pup.edu.ph")) {
            setIsSubmitting(false);
            return setError("Only PUP Webmail accounts are allowed.");
        }
        if (!student_id.trim()) {
            setIsSubmitting(false);
            return setError("Please enter your Student ID.");
        }
        if (!studentIdPattern.test(student_id)) {
            setIsSubmitting(false);
            return setError("Invalid Student ID format. Use format like 2023-00097-SM-0.");
        }

        // Check password complexity again (redundant but safe)
        if (!validatePassword(password)) {
            setIsSubmitting(false);
            return setError("Password does not meet complexity requirements.");
        }

        if (password !== confirmPassword) {
            setIsSubmitting(false);
            return setError("Passwords do not match!");
        }
        if (!email || !password) {
            setIsSubmitting(false);
            return setError("Email and Password fields are required.");
        }
        // --- End Validation Checks ---


        try {
            const user = await handleSignup(email, password, student_id);

            // API call to save user details to your database
            await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: email.split("@")[0],
                    uid: user.uid,
                    email,
                    studentId: student_id,
                    provider: "password",
                    role: "user",
                }),
            });

            onRegister?.({
                uid: user.uid,
                email: user.email || undefined,
                name: user.displayName || email.split("@")[0],
                provider: "password",
                role: "user"
            });
            await signOut(auth);
            setError("✅ Account created! Check your PUP Webmail to verify.");

            setTimeout(() => {
                setIsDialogOpen(false);
            }, 2500);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            let errorMessage = err.message;
            if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Try logging in.';
            } else if (err.code === 'auth/weak-password') {
                // Firebase Auth will still catch simple passwords, provide friendly error
                errorMessage = 'The password is too weak. Please choose a stronger one.';
            }
            setError(errorMessage);
        } finally {
            // Only stop spinning if registration failed or the success message is not shown
            if (!error?.startsWith('✅')) {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            {/* DIALOG TRIGGER */}
            <DialogTrigger asChild>
                <Button
                    className="text-sm bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl px-4 py-1.5 transition-colors"
                >
                    Register
                </Button>
            </DialogTrigger>

            {/* DIALOG CONTENT (The modal box) */}
            <DialogContent
                className="sm:max-w-[380px] w-[95%] max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none"
            >

                {/* CARD CONTAINER */}
                <Card className="border border-fuchsia-500/30 bg-fuchsia-950/70 backdrop-blur-xl shadow-2xl relative">
                    <CardHeader className="text-center pt-6 pb-2">
                        <CardTitle className="text-2xl font-extrabold text-fuchsia-400 tracking-wider">
                            iSITE<span className="text-white">+</span> SIGN UP
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3 p-4"> {/* Reduced padding/spacing */}

                        <form onSubmit={handleRegister} className="space-y-3"> {/* Reduced vertical spacing */}

                            {/* Email Field */}
                            <div className="space-y-1">
                                <Label htmlFor="email" className="text-sm font-semibold text-fuchsia-200">
                                    PUP Webmail
                                </Label>
                                <Input
                                    id="email"
                                    placeholder="isitemember@iskolarngbayan.pup.edu.ph"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-10 bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Student ID Field */}
                            <div className="space-y-1">
                                <Label htmlFor="studentId" className="text-sm font-semibold text-fuchsia-200">
                                    Student ID
                                </Label>
                                <Input
                                    id="studentId"
                                    placeholder="2023-00097-SM-0"
                                    type="text"
                                    value={student_id}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    className="h-10 bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60"
                                    required
                                    disabled={isSubmitting}
                                />
                                <p className="text-xs text-fuchsia-300/80">Format: YYYY-XXXXX-SM-X</p>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1">
                                <Label htmlFor="password" className="text-sm font-semibold text-fuchsia-200">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    placeholder="Enter password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-10 bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60"
                                    required
                                    disabled={isSubmitting}
                                />
                                {/* NEW: Password complexity feedback */}
                                {passwordError && (
                                    <p className={`text-xs ${passwordError.includes('requires') ? 'text-yellow-400' : 'text-red-400'}`}>
                                        🚨 {passwordError}
                                    </p>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-1">
                                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-fuchsia-200">
                                    Confirm Password
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    placeholder="Re-enter password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`h-10 bg-fuchsia-900/40 border focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60 ${matchError ? 'border-red-500 ring-1 ring-red-500' : 'border-fuchsia-700/50'}`}
                                    required
                                    disabled={isSubmitting}
                                />
                                {matchError && (
                                    <p className="text-xs text-red-400 font-semibold">
                                        ❌ Passwords do not match
                                    </p>
                                )}
                            </div>

                            {/* Error/Success Toast Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        key="toast-in-card"
                                        animate={{ opacity: 1, y: 0 }}
                                        initial={{ opacity: 0, y: 10 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg text-center ${error.startsWith("✅")
                                            ? "bg-green-600/90 text-white"
                                            : "bg-red-600/90 text-white"
                                            } transition-all duration-300`}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Buttons */}
                            <div className="flex flex-col space-y-2 pt-2"> {/* Reduced spacing */}
                                <Button
                                    className="w-full bg-fuchsia-700 text-white font-semibold rounded-xl hover:bg-fuchsia-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSubmitting || !!passwordError || matchError || !password || !confirmPassword}
                                    type="submit"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing Up...
                                        </span>
                                    ) : (
                                        "Sign up"
                                    )}
                                </Button>

                                <Button
                                    className="w-full text-fuchsia-200 border-fuchsia-600 hover:bg-fuchsia-800/30"
                                    variant="outline"
                                    onClick={handleCloseDialog}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                            </div>

                            {/* Optional: Already have an account link */}
                            <div className="text-center text-xs pt-1 pb-2">
                                <span className="text-white/70">Already have an account? </span>
                                <a href="#" className="text-fuchsia-300 hover:text-fuchsia-100 transition-colors font-semibold">
                                    Log In
                                </a>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
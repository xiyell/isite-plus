"use client";

import { useState, useEffect } from "react";
// Assuming @heroui/button is the Button your form uses (aliased here)
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { Loader2, Users, Eye, EyeOff } from "lucide-react";

import { handleSignup } from "@/services/auth";
import { auth } from "@/services/firebase";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { checkWhitelist, getWhitelistEntry } from "@/actions/whitelist";
import { createUser } from "@/actions/users";
import { User } from "@/types/user";

// --- Shadcn UI Components ---
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
// ----------------------------


export interface RegisterModalProps {
    onRegister?: (user: User) => void;
}

export default function RegisterModal({ onRegister }: RegisterModalProps) {
    const [email, setEmail] = useState("");
    const [student_id, setStudentId] = useState("");
    const [inputName, setInputName] = useState("");
    const [whitelistedName, setWhitelistedName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [yearLevel, setYearLevel] = useState("");
    const [section, setSection] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null); // New state for password complexity feedback
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Error is now permanent until clicked (dismissible)
    // useEffect(() => {
    //     if (error) {
    //         const timer = setTimeout(() => setError(null), 5000);
    //         return () => clearTimeout(timer);
    //     }
    // }, [error]);

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        // Reset form state on close
        setEmail("");
        setStudentId("");
        setInputName("");
        setWhitelistedName("");
        setPassword("");
        setConfirmPassword("");
        setYearLevel("");
        setSection("");
        setError(null);
        setPasswordError(null);
        setIsSubmitting(false);
        setIsRegistrationSuccess(false);
    };

    const studentIdPattern = /^\d{4}-\d{5}-SM-\d$/;
    
    const [matchError, setMatchError] = useState<boolean>(false); // New state for mismatch feedback

    // Listen for custom event to open modal
    useEffect(() => {
        const handleOpenEvent = () => setIsDialogOpen(true);
        window.addEventListener('open-register-modal', handleOpenEvent);
        return () => window.removeEventListener('open-register-modal', handleOpenEvent);
    }, []);

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


    const toTitleCase = (str: string) => {
        return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // --- Validation Checks ---
        // --- Validation Checks ---
        if (!email.endsWith("@iskolarngbayan.pup.edu.ph")) {
            setIsSubmitting(false);
            const msg = "Only PUP Webmail accounts are allowed.";
            setError(msg);
            toast({ title: "Validation Error", description: msg, variant: "destructive" });
            return;
        }
        if (!student_id.trim()) {
            setIsSubmitting(false);
            const msg = "Please enter your Student ID.";
            setError(msg);
            toast({ title: "Missing Field", description: msg, variant: "destructive" });
            return;
        }
        if (!studentIdPattern.test(student_id)) {
            setIsSubmitting(false);
            const msg = "Invalid Student ID format. Use format like 2023-00097-SM-0.";
            setError(msg);
            toast({ title: "Validation Error", description: msg, variant: "destructive" });
            return;
        }
        if (!inputName.trim()) {
            setIsSubmitting(false);
            const msg = "Please enter your Full Name.";
            setError(msg);
            toast({ title: "Missing Field", description: msg, variant: "destructive" });
            return;
        }
        if (!yearLevel) {
            setIsSubmitting(false);
            const msg = "Please select your Year Level.";
            setError(msg);
            toast({ title: "Missing Field", description: msg, variant: "destructive" });
            return;
        }
        if (!section) {
            setIsSubmitting(false);
            const msg = "Please select your Section.";
            setError(msg);
            toast({ title: "Missing Field", description: msg, variant: "destructive" });
            return;
        }

        // Check password complexity again (redundant but safe)
        if (!validatePassword(password)) {
            setIsSubmitting(false);
            const msg = "Password does not meet complexity requirements.";
            setError(msg);
            toast({ title: "Weak Password", description: msg, variant: "destructive" });
            return;
        }

        if (password !== confirmPassword) {
            setIsSubmitting(false);
            const msg = "Passwords do not match!";
            setError(msg);
            toast({ title: "Validation Error", description: msg, variant: "destructive" });
            return;
        }
        // --- End Validation Checks ---

        try {
            // 1. Final Whitelist Verification
            const checkData = await checkWhitelist(student_id, inputName);

            if (!checkData.allowed) {
                setIsSubmitting(false);
                return setError(checkData.error || "Whitelist verification failed.");
            }

            // --- NAME VERIFICATION ---
            // Note: server action checkWhitelist already validates the name.

            // 2. Auth Signup
            const user = await handleSignup(email, password, student_id);

            // Save user details to database via Server Action
            await createUser({
                name: toTitleCase(inputName),
                uid: user.uid,
                email,
                studentId: student_id,
                provider: "password",
                yearLevel: yearLevel,
                section: section
            });
            onRegister?.({
                uid: user.uid,
                email: user.email || undefined,
                name: user.displayName || email.split("@")[0],
                provider: "password",
                role: "user"
            });
            await signOut(auth);
            
            // Show Success Notification View
            setIsRegistrationSuccess(true);
            setIsSubmitting(false); // Stop loading spinner

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
                className="sm:max-w-[380px] w-[95%] p-0 bg-transparent border-none shadow-none overflow-visible"
            >
                <VisuallyHidden><DialogTitle>Register Modal</DialogTitle></VisuallyHidden>

                {/* CARD CONTAINER */}
                <Card className="border border-fuchsia-500/30 bg-fuchsia-950/70 backdrop-blur-xl shadow-2xl relative">
                    {isRegistrationSuccess ? (
                        <div className="p-6 flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 animate-pulse rounded-full" />
                                <div className="relative h-16 w-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                    <Users className="h-8 w-8 text-green-400" />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 tracking-tight">
                                    Registration Successful!
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed max-w-[90%] mx-auto">
                                    We've sent a verification email to <span className="text-fuchsia-400 font-semibold">{email}</span>.
                                </p>
                                
                                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-left flex gap-3">
                                    <div className="shrink-0 mt-0.5">
                                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                    </div>
                                    <p className="text-xs text-amber-200/90 leading-snug">
                                        <strong>One last step:</strong> You must verify your email before logging in. Please check your inbox (and spam/junk folders).
                                    </p>
                                </div>
                            </div>

                            <Button 
                                onClick={handleCloseDialog}
                                className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold py-5 rounded-xl shadow-lg shadow-fuchsia-900/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                I Understand, Close
                            </Button>
                        </div>
                    ) : (
                        <>
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
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                setStudentId(val);
                                                // Auto-verify if format is correct
                                                if (studentIdPattern.test(val)) {
                                                    try {
                                                        const data = await getWhitelistEntry(val);
                                                        if (data) {
                                                            setWhitelistedName(toTitleCase(data.name));
                                                            setError(null);
                                                        } else {
                                                            setWhitelistedName("");
                                                            setError("Student ID not found in whitelist.");
                                                        }
                                                    } catch {
                                                        console.error("Verification failed");
                                                    }
                                                } else {
                                                    setWhitelistedName("");
                                                }
                                            }}
                                            className="h-10 bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60"
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-xs text-fuchsia-300/80">Format: YYYY-XXXXX-SM-X</p>
                                    </div>

                                    {/* Full Name Input Field (Added for verification) */}
                                    <div className="space-y-1">
                                        <Label htmlFor="fullName" className="text-sm font-semibold text-fuchsia-200">
                                            Full Name
                                        </Label>
                                        <Input
                                            id="fullName"
                                            placeholder="Enter your full name"
                                            type="text"
                                            value={inputName}
                                            onChange={(e) => setInputName(e.target.value)}
                                            className="h-10 bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60"
                                            required
                                            disabled={isSubmitting}
                                        />
                                        <p className="text-xs text-fuchsia-300/80">Format: Ciel Angelo Mendoza</p>
                                    </div>

                                    {/* Match Feedback (Optional but helpful) */}
                                    <AnimatePresence>
                                        {whitelistedName && inputName.toLowerCase().trim() === whitelistedName.toLowerCase().trim() && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-green-500/20 border border-green-500/30 rounded-lg p-2 flex items-center gap-2"
                                            >
                                                <div className="bg-green-500 rounded-full p-1">
                                                    <Loader2 className="h-3 w-3 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-green-300 font-bold tracking-tighter">Verified Identity</p>
                                                    <p className="text-sm text-white font-semibold">{whitelistedName}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Academic Info Row */}
                                    <div className="grid grid-cols-2 gap-3 pb-2">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-semibold text-fuchsia-200">Year Level</Label>
                                            <Select value={yearLevel} onValueChange={setYearLevel}>
                                                <SelectTrigger className="h-10 bg-fuchsia-900/40 border-fuchsia-700/50 text-white focus:ring-fuchsia-500">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                                                    <SelectItem value="1st Year" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">1st Year</SelectItem>
                                                    <SelectItem value="2nd Year" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">2nd Year</SelectItem>
                                                    <SelectItem value="3rd Year" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">3rd Year</SelectItem>
                                                    <SelectItem value="4th Year" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">4th Year</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-sm font-semibold text-fuchsia-200">Section</Label>
                                            <Select value={section} onValueChange={setSection}>
                                                <SelectTrigger className="h-10 bg-fuchsia-900/40 border-fuchsia-700/50 text-white focus:ring-fuchsia-500">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                                                    <SelectItem value="1" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Section 1</SelectItem>
                                                    <SelectItem value="2" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Section 2</SelectItem>
                                                    <SelectItem value="3" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Section 3</SelectItem>
                                                    <SelectItem value="4" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Section 4</SelectItem>
                                                    <SelectItem value="None" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">None</SelectItem>
                                                    <SelectItem value="Irregular" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Irregular</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Password Field */}
                                    <div className="space-y-1">
                                        <Label htmlFor="password" className="text-sm font-semibold text-fuchsia-200">
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                placeholder="Enter password"
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="h-10 bg-fuchsia-900/40 border border-fuchsia-700/50 focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60 pr-10"
                                                required
                                                disabled={isSubmitting}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-fuchsia-400 hover:text-fuchsia-200 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
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
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                placeholder="Re-enter password"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={`h-10 bg-fuchsia-900/40 border focus-visible:ring-fuchsia-500 text-white placeholder-fuchsia-400/60 pr-10 ${matchError ? 'border-red-500 ring-1 ring-red-500' : 'border-fuchsia-700/50'}`}
                                                required
                                                disabled={isSubmitting}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-fuchsia-400 hover:text-fuchsia-200 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
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
                                                onClick={() => setError(null)}
                                                className={`px-4 py-2 text-sm font-medium rounded-lg text-center cursor-pointer ${error.startsWith("✅")
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
                        </>
                    )}
                </Card>
            </DialogContent>
        </Dialog>
    );
}
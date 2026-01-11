'use client';
import * as React from 'react';
import { Button as Button } from '@/components/ui/Button';
import { useState } from 'react';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
} from '@/components/ui/NavigationMenu';
import { cn } from '@/lib/utils';
import clsx from 'clsx';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { User } from '@/types/user';
import { useIsScrolled, useScrollProgress } from '@/hooks/use-scroll';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '@/types/user-role';
import { auth } from '@/services/firebase';
import { logoutAction } from "@/actions/auth";
import { useAuth } from '@/services/auth';
import { useToast } from "@/components/ui/use-toast";

// 🚀 IMPORT MODALS (Ensure correct paths: e.g., './login' or './LoginModal')
import LoginModal from './login';
import RegisterModal from './register'; // Assuming the new file name is RegisterModal.tsx

export interface NavbarNavLink {
    href: string;
    label: string;
    active?: boolean;
    rolesAllowed: UserRole[];
    group?: 'tools';
}
export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
    logo?: React.ReactNode;
    logoHref?: string;
    navigationLinks?: NavbarNavLink[];
}

// ------------------------------------------------------------------------
// UPDATED mainNavLinks ARRAY - Structured as requested
// ------------------------------------------------------------------------
const mainNavLinks: NavbarNavLink[] = [
    { href: '/', label: 'Home', active: true, rolesAllowed: ['guest', 'user', 'admin', 'moderator'] },
    { href: '/announcement', label: 'Announcement', rolesAllowed: ['guest', 'user', 'admin', 'moderator'] },
    { href: '/community', label: 'Community', rolesAllowed: ['user', 'admin', 'moderator'] },

    // Grouped links (Dropdown)
    { href: '/about', label: 'About', rolesAllowed: ['guest', 'user', 'admin', 'moderator'], group: 'tools' },
    { href: '/iQr', label: 'iQR', rolesAllowed: ['user', 'admin', 'moderator'], group: 'tools' },
    { href: '/profile', label: 'Profile', rolesAllowed: ['user', 'admin', 'moderator'], group: 'tools' },
    { href: '/dashboard', label: 'Dashboard', rolesAllowed: ['admin', 'moderator'], group: 'tools' },
    { href: '/iReader', label: 'iReader', rolesAllowed: ['admin', 'moderator'], group: 'tools' },
    { href: '/ievaluation', label: 'iEvaluation', rolesAllowed: ['user', 'admin', 'moderator'], group: 'tools' },
];
// ------------------------------------------------------------------------

export default function Navbar() {
    /*
    ------------------------------------------------------------------------
        USE STATES 
    ------------------------------------------------------------------------
    */
    const { toast } = useToast();
    const { user: authUser, loading: authLoading } = useAuth();
    const [user, setUser] = useState<User | null>(null);

    // Sync global auth state to local navbar state
    React.useEffect(() => {
        const fetchUserRole = async () => {
            if (!authLoading && authUser && authUser.emailVerified) {
                try {
                     // Dynamically import needed functions to avoid top-level SSR issues if any, 
                     // though standard import is fine. adhering to previous patterns.
                     const { doc, getDoc } = await import("firebase/firestore"); 
                     const { db } = await import("@/services/firebase");
                     
                     const userDoc = await getDoc(doc(db, "users", authUser.uid));
                     const userData = userDoc.data();
                     const realRole = (userData?.role as UserRole) || 'user';
                     
                     setUser({
                        ...authUser as unknown as User,
                        role: realRole
                     });
                } catch (e) {
                     console.error("Error fetching navbar role", e);
                     // Fallback
                     setUser({
                        ...authUser as unknown as User,
                        role: 'user'
                     });
                }
            } else if (!authLoading && !authUser) {
                setUser(null);
            }
        };
        fetchUserRole();
    }, [authUser, authLoading]);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
    const isMobile = useIsMobile();
    const progress = useScrollProgress();
    const isScrolled = useIsScrolled();

    /*
    ------------------------------------------------------------------------
        HANDLERS
    ------------------------------------------------------------------------
    */
    // Handles successful login from the LoginModal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLogin = (loggedUser: any) => {
        setUser({
            ...loggedUser,
            role: loggedUser.role as UserRole || 'user'
        });
    };

    // Handles successful registration (usually used to trigger a toast/feedback in the parent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRegistrationSuccess = (user: any) => {
        console.log('User successfully registered:', user);
        // We typically don't log in immediately after registration; 
        // the user must verify their email first (as implemented in your modal logic).
    }

    // Updated logout handler to clear both Firebase auth and server cookies
    const handleSignOut = async () => {
        try {
            console.log("Logout initiated...");
            // 1. Sign out from Firebase
            await auth.signOut();
            console.log("Firebase signOut complete");

            // 2. Clear server-side admin cookie
            await logoutAction();
            console.log("Server logout complete");

            setUser(null);
            toast({
                title: "Logged out",
                description: "You have been successfully logged out.",
            });
            // 3. Force redirect to home
            window.location.href = "/";
        } catch (error) {
            console.error("Logout failed", error);
            toast({
                title: "Logout Failed",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    }
    const toggleToolsDropdown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsToolsDropdownOpen(prev => !prev);
    };

    const handleLinkClick = (e: React.MouseEvent, link: NavbarNavLink) => {
        if (!link.rolesAllowed.includes(currentUserRole)) {
            e.preventDefault();
            toast({
                title: "Access Restricted",
                description: `You are not able to access this page. Please log in with an authorized account.`,
                variant: "destructive",
            });
            setIsToolsDropdownOpen(false);
            setIsMobileMenuOpen(false);
        }
    };

    const currentUserRole = user?.role as UserRole || ('guest' as UserRole);

    // Filter links based on role visibility
    const filteredNavLinks = mainNavLinks.filter(link => {
        return link.rolesAllowed.includes(currentUserRole);
    });

    const mainLinks = filteredNavLinks.filter(link => !link.group);
    const groupedLinks = filteredNavLinks.filter(link => link.group === 'tools');
    const isGroupVisible = groupedLinks.length > 0;

    // Close the dropdown when the mobile menu is opened/closed
    React.useEffect(() => {
        if (isMobileMenuOpen) {
            setIsToolsDropdownOpen(false);
        }
    }, [isMobileMenuOpen]);

    // Close the dropdown when a user clicks outside of it (desktop only)
    React.useEffect(() => {
        if (!isMobile) {
            const handleOutsideClick = (event: MouseEvent) => {
                const navElement = document.getElementById('tools-nav-item');
                if (navElement && !navElement.contains(event.target as Node)) {
                    setIsToolsDropdownOpen(false);
                }
            };

            document.addEventListener('mousedown', handleOutsideClick);
            return () => document.removeEventListener('mousedown', handleOutsideClick);
        }
    }, [isMobile]);


    return (
        <>
            <motion.nav
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className={clsx(
                    "fixed top-0 w-full z-[100] transition-all duration-500  backdrop-blur-xl border-b ",
                    isScrolled
                        ? "bg-fuchsia-950/70 border-fuchsia-900/60 shadow-[0_4px_20px_rgba(217,70,239,0.25)]"
                        : "bg-gradient-to-b from-fuchsia-950/40 to-transparent border-transparent"
                )}
            >
                <div className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-10 py-5 sm:py-6">

                    <div className="flex items-center gap-2">

                        {isMobile && (
                            <Button
                                className="text-fuchsia-200 hover:text-fuchsia-400 transition-colors p-2 z-[110] relative"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </Button>
                        )}
                        {/* Main nav */}

                        <div className="flex items-center gap-6">
                            {/* Logo  */}
                            <button
                                onClick={(e) => e.preventDefault()}
                                className="flex items-center space-x-2 text-primary hover:text-primary/90 transition-colors cursor-pointer"
                            >
                                <span className="hidden font-bold text-xl sm:inline-block">
                                    <h1 className="text-2xl font-bold tracking-wide text-white select-none">
                                        iSITE<span className="text-fuchsia-400">+</span>
                                    </h1></span>
                            </button>
                            {/* Navigation menu */}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {!isMobile && (
                            <NavigationMenu className="flex">
                                <NavigationMenuList className="space-x-8">
                                    {/* Regular Links (Home, Announcement, Community, Feedback, About) */}
                                    {mainLinks.map((link, index) => (
                                        <NavigationMenuItem key={index}>
                                            <Link
                                                href={link.href}
                                                onClick={(e) => handleLinkClick(e, link)}
                                                className={cn(
                                                    "text-gray-200 hover:text-fuchsia-300 text-sm font-semibold uppercase transition-colors",
                                                    link.active ? "text-fuchsia-400" : ""
                                                )}
                                            >
                                                {link.label}
                                            </Link>
                                        </NavigationMenuItem>
                                    ))}

                                    {/* 🚀 Grouped Links Section - Click-to-Open Logic */}
                                    {isGroupVisible && (
                                        <NavigationMenuItem id="tools-nav-item" className="relative">
                                            <Button
                                                variant="ghost"
                                                onClick={toggleToolsDropdown}
                                                className={cn(
                                                    "text-gray-200 hover:text-fuchsia-300 text-sm font-semibold uppercase px-3 py-2 h-auto flex items-center transition-colors",
                                                    isToolsDropdownOpen && "text-fuchsia-300"
                                                )}
                                            >
                                                Menu
                                                <ChevronDown
                                                    className={cn(
                                                        "ml-1 h-4 w-4 transition-transform duration-200",
                                                        isToolsDropdownOpen && "rotate-180"
                                                    )}
                                                />
                                            </Button>

                                            {/* Submenu for grouped links */}
                                            <AnimatePresence>
                                                {isToolsDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="absolute top-full left-1/2 -translate-x-1/2 pt-4 z-50 origin-top"
                                                    >
                                                        <ul className="w-48 p-1.5 rounded-xl shadow-2xl backdrop-blur-4xl  border border-white/30 bg-black/80">
                                                            {groupedLinks.map((link, index) => (
                                                                <li key={index}>
                                                                    <Link
                                                                        href={link.href}
                                                                        onClick={(e) => {
                                                                            handleLinkClick(e, link);
                                                                            if (link.rolesAllowed.includes(currentUserRole)) {
                                                                                setIsToolsDropdownOpen(false);
                                                                            }
                                                                        }}
                                                                        className={cn(
                                                                            "block p-2 text-sm text-fuchsia-100 rounded-lg transition-colors",
                                                                            link.active
                                                                                ? "bg-fuchsia-700/50 text-white font-semibold"
                                                                                : "text-white/80 hover:bg-fuchsia-600/30 hover:text-white"
                                                                        )}
                                                                    >
                                                                        {link.label}
                                                                    </Link>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </NavigationMenuItem>
                                    )}

                                </NavigationMenuList>
                            </NavigationMenu>
                        )}
                    </div>
                    {/* Right side */}
                    {!user ? <div className=" flex items-center gap-2">
                        {/* Login Modal Integration */}
                        <LoginModal
                            onLogin={handleLogin}
                        />

                        {/* Register Modal Integration */}
                        <RegisterModal
                            onRegister={handleRegistrationSuccess}
                        />

                    </div> :
                        <Button
                            className="text-sm bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl px-4 py-1.5 transition-colors"
                            onClick={(e) => {
                                e.preventDefault();
                                handleSignOut();
                            }}
                        >
                            Sign Out
                        </Button>
                    }
                </div>
                <div
                    className="h-[3px] bg-gradient-to-r from-fuchsia-400 to-fuchsia-700"
                    style={{ width: `${progress}%` }}
                />
            </motion.nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobile && isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            // 🚀 CHANGED: Increased blur to backdrop-blur-3xl
                            className="fixed inset-0 z-[105] bg-black/70 backdrop-blur-3xl"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />

                        {/* Popup Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: "-50%", x: "-50%" }}
                            animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
                            exit={{ opacity: 0, scale: 0.9, y: "-50%", x: "-50%" }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                            // 🚀 CHANGED: Updated background opacity to make it stand out against the heavy blur
                            className="fixed top-1/2 left-1/2 z-[110] w-[90%] max-w-md bg-fuchsia-950/70 backdrop-blur-2xl border border-fuchsia-500/30 rounded-2xl shadow-2xl p-6 flex flex-col items-center pt-10 gap-6"
                        >
                            <div className="flex justify-between items-center w-full border-b border-white/10 pb-4">
                                <h2 className="text-xl font-bold text-white tracking-wide">Menu</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-fuchsia-200 hover:text-fuchsia-400 hover:bg-white/10 rounded-full"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <X size={20} />
                                </Button>
                            </div>

                            <div className="flex flex-col items-center gap-4 w-full">
                                {filteredNavLinks.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.href}
                                        onClick={(e) => handleLinkClick(e, link)}
                                        className={cn(
                                            "w-full text-center py-3 backdrop-blur-2xl rounded-xl text-lg font-medium transition-all duration-200",
                                            link.active
                                                ? "bg-fuchsia-600/40 text-fuchsia-100 border border-fuchsia-500/30"
                                                : "text-white/80 hover:bg-fuchsia-600/30 hover:text-white"
                                        )}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
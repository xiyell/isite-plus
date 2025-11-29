'use client';
import * as React from 'react';
import { Button as Button } from '@/components/ui/Button';
import { useState, useRef } from 'react';
import {
    NavigationMenu,
    NavigationMenuItem,

    NavigationMenuList,
} from '@/components/ui/NavigationMenu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/Popover';
import { cn } from '@/lib/utils';
import clsx from 'clsx';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { User } from '@/types/user';
import { useIsScrolled, useScrollProgress } from '@/hooks/use-scroll';
import { motion } from 'framer-motion';
import { UserRole } from '@/types/user-role';


export interface NavbarNavLink {
    href: string;
    label: string;
    active?: boolean;
    rolesAllowed: UserRole[];
}
export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
    logo?: React.ReactNode;
    logoHref?: string;
    navigationLinks?: NavbarNavLink[];
}

const mainNavLinks: NavbarNavLink[] = [
  { href: '/', label: 'Home', active: true, rolesAllowed: ['guest', 'user', 'admin'] },
  { href: '/announcement', label: 'Announcement', rolesAllowed: ['guest', 'user', 'admin'] },
  { href: '/community', label: 'Community', rolesAllowed: ['user', 'admin'] },
  { href: '/feedback', label: 'Feedback', rolesAllowed: ['user', 'admin'] },
  { href: '/about', label: 'About', rolesAllowed: ['guest', 'user', 'admin'] },
  { href: '/admin', label: 'Admin', rolesAllowed: ['admin'] }
];


export default function Navbar() {
    /*
    ------------------------------------------------------------------------

        USE STATES 

    ------------------------------------------------------------------------
    */
    const [user, setUser] = useState<User | null>(null);
    const isMobile = useIsMobile();
    const progress = useScrollProgress();
    const isScrolled = useIsScrolled();
    /*
     ------------------------------------------------------------------------
     
         HANDLERS
 
     ------------------------------------------------------------------------
     */
    const handleLogin = () => {
        setUser({ role: 'user' });
    };
    const handleRegister = () => {

    }
    const handleSignOut = () => {
        setUser(null);
        console.log('User signed out');
    }
    const currentUserRole = user?.role as UserRole|| ('guest' as UserRole);
    const visibleLinks = mainNavLinks.filter(link =>
        link.rolesAllowed.includes(currentUserRole)
    );

    return (
        <motion.nav
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={clsx(
                "fixed top-0 w-full z-[100] transition-all duration-500 backdrop-blur-xl border-b",
                isScrolled
                    ? "bg-fuchsia-950/70 border-fuchsia-900/60 shadow-[0_4px_20px_rgba(217,70,239,0.25)]"
                    : "bg-gradient-to-b from-fuchsia-950/40 to-transparent border-transparent"
            )}
        >
            <div className="max-w-7xl mx-auto flex justify-between items-center px-6 md:px-10 py-4">

                <div className="flex items-center gap-2">

                    {isMobile && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    className="text-fuchsia-200 hover:text-fuchsia-400 transition-colors p-2"
                                    variant="ghost"
                                    size="icon"
                                >
                                    <Menu size={24} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-48 p-2">
                                <NavigationMenu className="max-w-none">
                                    <NavigationMenuList className="flex-col items-start gap-1">
                                        {visibleLinks.map((link, index) => (
                                            <NavigationMenuItem key={index} className="w-full">
                                                <Link
                                                    href={link.href}
                                                    className={cn(
                                                        "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer no-underline",
                                                        link.active
                                                            ? "bg-accent text-accent-foreground"
                                                            : "text-foreground/80"
                                                    )}
                                                >
                                                    {link.label}
                                                </Link>
                                            </NavigationMenuItem>
                                        ))}
                                    </NavigationMenuList>
                                </NavigationMenu>
                            </PopoverContent>
                        </Popover>
                    )}
                    {/* Main nav */}
                    <div className="flex items-center gap-6">
                        {/* Logo  */}
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
                        {!isMobile && (
                            <NavigationMenu className="flex ">
                                <NavigationMenuList className="space-x-8">
                                    {visibleLinks.map((link, index) => (
                                        <NavigationMenuItem key={index}>
                                            <Link
                                                href={link.href}

                                                className={cn(
                                                    "text-gray-200 hover:text-fuchsia-300 text-sm font-semibold uppercase",
                                                    link.active
                                                        ? ""
                                                        : ""
                                                )}
                                            >
                                                {link.label}
                                            </Link>
                                        </NavigationMenuItem>
                                    ))}
                                </NavigationMenuList>
                            </NavigationMenu>
                        )}
                    </div>
                </div>
                {/* Right side */}
                {!user ? <div className=" flex items-center gap-3">

                    <Button

                        className="text-sm text-fuchsia-200 border-fuchsia-500/50 hover:bg-fuchsia-600/20"
                        onClick={(e) => {
                            e.preventDefault();
                            handleLogin();
                        }}
                    >
                        Login
                    </Button>
                    <Button

                        className="text-sm bg-linear-to-r from-fuchsia-500 to-fuchsia-700 text-white rounded-xl px-4 py-1.5"
                        onClick={(e) => {
                            e.preventDefault();
                            handleRegister();
                        }}
                    >
                        Register
                    </Button>
                </div> :
                    <Button

                        className="text-sm bg-linear-to-r from-fuchsia-500 to-fuchsia-700 text-white rounded-xl px-4 py-1.5"
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
    );
}




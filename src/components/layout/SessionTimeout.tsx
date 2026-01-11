'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/services/firebase';
import { useToast } from '@/components/ui/use-toast';
import { logoutAction } from '@/actions/auth';

// 15 minutes in milliseconds
const SESSION_DURATION = 15 * 60 * 1000;
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

export default function SessionTimeout() {
    const { toast } = useToast();
    const router = useRouter();
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const absoluteTimerRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleSignOut = useCallback(async () => {
        try {
            console.log("Session expired: Logging out...");
            await logoutAction();
            await auth.signOut();
            router.replace("/?sessionExpired=true");
        } catch (error) {
            console.error("Auto-logout failed", error);
            router.replace("/?sessionExpired=true");
        }
    }, [router]);

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        
        if (auth.currentUser) {
            inactivityTimerRef.current = setTimeout(() => {
                handleSignOut();
            }, INACTIVITY_TIMEOUT);
        }
    }, [handleSignOut]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('sessionExpired') === 'true') {
                 // Prevent duplicate toasts using a short timeout or ref if necessary, 
                 // but simple check is usually enough if we clean the URL immediately.
                
                // Delay slightly to ensure UI is ready
                setTimeout(() => {
                    toast({
                        title: "Session Expired",
                        description: "You have been logged out due to inactivity.",
                        variant: "destructive", 
                    });
                }, 500);
                
                // Clean URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [toast]);

    useEffect(() => {
        // 1. Setup Absolute Timeout (Force login every 15 mins)
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // Clear existing
                if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
                if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

                // A. Warning at 14 minutes
                warningTimerRef.current = setTimeout(() => {
                    toast({
                        title: "Session Expiring Soon ⏳",
                        description: "Your session will end in 1 minute automatically. Please save your work.",
                        variant: "destructive",
                        duration: 60000, 
                    });
                }, SESSION_DURATION - 60000);

                // B. Hard Logout at 15 minutes
                absoluteTimerRef.current = setTimeout(() => {
                    handleSignOut();
                }, SESSION_DURATION);

                resetInactivityTimer();
            } else {
                if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
                if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
                if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            }
        });

        // 2. Setup Inactivity Listeners
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        const handleActivity = () => resetInactivityTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            unsubscribe();
            if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [handleSignOut, resetInactivityTimer, toast]);

    return null;
}

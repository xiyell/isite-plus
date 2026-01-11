'use client';

import { useEffect, useRef, useCallback } from 'react';
import { auth } from '@/services/firebase';
import { useToast } from '@/components/ui/use-toast';
import { logoutAction } from '@/actions/auth';

// 10 minutes in milliseconds
const SESSION_DURATION = 10 * 60 * 1000;
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

export default function SessionTimeout() {
    const { toast } = useToast();
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const absoluteTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleSignOut = useCallback(async () => {
        try {
            console.log("Session expired: Logging out...");
            await logoutAction();
            await auth.signOut();
            // Redirect with flag to show toast after reload
            window.location.href = "/?sessionExpired=true";
        } catch (error) {
            console.error("Auto-logout failed", error);
            // Fallback redirect even if signOut fails
             window.location.href = "/?sessionExpired=true";
        }
    }, []);

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        
        if (auth.currentUser) {
            inactivityTimerRef.current = setTimeout(() => {
                handleSignOut();
            }, INACTIVITY_TIMEOUT);
        }
    }, [handleSignOut]);

    useEffect(() => {
        // Check for session expired flag on mount (after redirect)
        // Using window.location directly to avoid Next.js Suspense boundary requirements for useSearchParams
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('sessionExpired') === 'true') {
                // Small delay to ensure UI is ready
                setTimeout(() => {
                    toast({
                        title: "Session Finished",
                        description: "Your session has finished. Please log in again.",
                        variant: "destructive", 
                    });
                }, 100);
                
                // Clean URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
            }
        }
    }, [toast]);

    useEffect(() => {
        // 1. Setup Absolute Timeout (Force login every 10 mins)
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // When user logs in, set an absolute timer
                if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
                absoluteTimerRef.current = setTimeout(() => {
                    handleSignOut();
                }, SESSION_DURATION);

                resetInactivityTimer();
            } else {
                if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
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
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [handleSignOut, resetInactivityTimer]);

    return null;
}

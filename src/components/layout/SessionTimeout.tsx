'use client';

import { useEffect, useRef, useCallback } from 'react';
import { auth } from '@/services/firebase';
import { useToast } from '@/components/ui/use-toast';

// 5 minutes in milliseconds
const TIMEOUT_MS = 5 * 60 * 1000;

export default function SessionTimeout() {
    const { toast } = useToast();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Re-using the logout logic from Navbar for consistency
    const handleSignOut = useCallback(async () => {
        try {
            console.log("Session timeout: Logging out due to inactivity...");

            // 1. Sign out from Firebase
            await auth.signOut();

            // 2. Clear server-side admin cookie via API
            // Using beacon/keepalive to ensure request completes even as page unloads
            navigator.sendBeacon('/api/auth/logout');

            // 3. Force redirect to home
            window.location.href = "/";

        } catch (error) {
            console.error("Auto-logout failed", error);
        }
    }, []);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Only set timer if user is actually logged in
        if (auth.currentUser) {
            timerRef.current = setTimeout(() => {
                toast({
                    title: "Session Expired",
                    description: "You have been logged out due to inactivity.",
                    variant: "destructive",
                });
                handleSignOut();
            }, TIMEOUT_MS);
        }
    }, [handleSignOut, toast]);

    useEffect(() => {
        // Events to listen for
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // Handler wrapper
        const handleActivity = () => {
            resetTimer();
        };

        // Initialize timer
        resetTimer();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Cleanup
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer]);

    return null; // This component renders nothing
}

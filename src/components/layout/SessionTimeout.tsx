'use client';

import { useEffect, useRef, useCallback } from 'react';
import { auth } from '@/services/firebase';
import { useToast } from '@/components/ui/use-toast';

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
            await auth.signOut();
            navigator.sendBeacon('/api/auth/logout');
            window.location.href = "/";
        } catch (error) {
            console.error("Auto-logout failed", error);
        }
    }, []);

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        
        if (auth.currentUser) {
            inactivityTimerRef.current = setTimeout(() => {
                toast({
                    title: "Session Expired",
                    description: "You have been logged out due to inactivity.",
                    variant: "destructive",
                });
                handleSignOut();
            }, INACTIVITY_TIMEOUT);
        }
    }, [handleSignOut, toast]);

    useEffect(() => {
        // 1. Setup Absolute Timeout (Force login every 10 mins)
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // When user logs in, set an absolute timer
                if (absoluteTimerRef.current) clearTimeout(absoluteTimerRef.current);
                absoluteTimerRef.current = setTimeout(() => {
                    toast({
                        title: "Session Timed Out",
                        description: "Your 10-minute session has reached its limit. Please log in again.",
                        variant: "destructive",
                    });
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
    }, [handleSignOut, resetInactivityTimer, toast]);

    return null;
}

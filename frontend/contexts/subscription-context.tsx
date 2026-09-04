'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { SubscriptionStatus } from '@/lib/types';

interface SubscriptionContextType {
    isSubscriptionValid: boolean;
    isTrialExpired: boolean;
    isSubscriptionExpired: boolean;
    isLoading: boolean;
    daysRemaining: number;
    checkSubscriptionStatus: () => void;
    subscriptionStatus: SubscriptionStatus | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
    const [isSubscriptionValid, setIsSubscriptionValid] = useState(true);
    const [isTrialExpired, setIsTrialExpired] = useState(false);
    const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState(0);

    const checkSubscriptionStatus = useCallback(() => {
        if (!user || !isAuthenticated) {
            setIsLoading(false);
            setIsSubscriptionValid(true); // Default to true for non-authenticated users
            return;
        }

        const subscription = user.organization?.subscription;

        if (!subscription) {
            // No subscription found - treat as expired
            setIsSubscriptionValid(false);
            setIsSubscriptionExpired(true);
            setSubscriptionStatus(null);
            setDaysRemaining(0);
            setIsLoading(false);
            return;
        }

        setSubscriptionStatus(subscription.status);

        // Calculate days remaining
        const endDate = new Date(subscription.endDate);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(Math.max(0, diffDays));

        // Check subscription status
        if (subscription.status === SubscriptionStatus.EXPIRED) {
            setIsSubscriptionValid(false);
            setIsSubscriptionExpired(true);
            setIsTrialExpired(false);
        } else if (subscription.status === SubscriptionStatus.CANCELLED) {
            // Cancelled but may still have days remaining
            if (now > endDate) {
                setIsSubscriptionValid(false);
                setIsSubscriptionExpired(true);
            } else {
                setIsSubscriptionValid(true);
                setIsSubscriptionExpired(false);
            }
            setIsTrialExpired(false);
        } else if (subscription.status === SubscriptionStatus.TRIAL) {
            // Check if trial has expired
            if (now > endDate) {
                setIsSubscriptionValid(false);
                setIsTrialExpired(true);
                setIsSubscriptionExpired(false);
            } else {
                setIsSubscriptionValid(true);
                setIsTrialExpired(false);
                setIsSubscriptionExpired(false);
            }
        } else if (subscription.status === SubscriptionStatus.ACTIVE) {
            // Check if active subscription has expired
            if (now > endDate) {
                setIsSubscriptionValid(false);
                setIsSubscriptionExpired(true);
                setIsTrialExpired(false);
            } else {
                setIsSubscriptionValid(true);
                setIsSubscriptionExpired(false);
                setIsTrialExpired(false);
            }
        } else if (subscription.status === SubscriptionStatus.SUSPENDED) {
            setIsSubscriptionValid(false);
            setIsSubscriptionExpired(true);
            setIsTrialExpired(false);
        } else {
            // Default: treat as valid
            setIsSubscriptionValid(true);
            setIsSubscriptionExpired(false);
            setIsTrialExpired(false);
        }

        setIsLoading(false);
    }, [user, isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            checkSubscriptionStatus();
        }
    }, [authLoading, checkSubscriptionStatus]);

    const value = {
        isSubscriptionValid,
        isTrialExpired,
        isSubscriptionExpired,
        isLoading: isLoading || authLoading,
        daysRemaining,
        checkSubscriptionStatus,
        subscriptionStatus,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}

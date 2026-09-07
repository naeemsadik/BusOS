'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/contexts/subscription-context';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Cookies from 'js-cookie';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

// Pages that are always accessible even when subscription is expired
const ALWAYS_ACCESSIBLE_PAGES = [
  '/subscription',
  '/auth',
  '/profile',
  '/support',
  '/dashboard',
  '/reports',
];

// Check if a path is accessible when subscription is expired
function isPageAccessible(pathname: string): boolean {
  return ALWAYS_ACCESSIBLE_PAGES.some(page => pathname.startsWith(page)) || pathname === '/';
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const {
    isSubscriptionValid,
    isTrialExpired,
    isSubscriptionExpired,
    isLoading: subscriptionLoading,
    daysRemaining
  } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  const isLoading = authLoading || subscriptionLoading;

  useEffect(() => {
    // Don't redirect if still loading or not authenticated
    if (isLoading || !isAuthenticated || !user) {
      return;
    }

    // If subscription is invalid and user is not on an accessible page, redirect
    if (!isSubscriptionValid && !isPageAccessible(pathname)) {
      router.push('/subscription');
    }
  }, [user, isLoading, isAuthenticated, pathname, router, isSubscriptionValid]);

  // Show loading state while checking
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Check for token as a fallback
  const hasToken = !!Cookies.get('access_token');

  // Don't render anything if not authenticated and no token
  // If there's a token but auth not loaded, show loading
  if (!isAuthenticated) {
    if (hasToken) {
      // Token exists but auth not loaded yet - show loading
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p>Authenticating...</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // If user has valid subscription or on accessible pages, render children
  if (isSubscriptionValid || isPageAccessible(pathname)) {
    return <>{children}</>;
  }

  // Show subscription required message while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6 max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            {isTrialExpired ? 'Trial Expired' : 'Subscription Expired'}
          </h2>
          <p className="text-muted-foreground">
            {isTrialExpired
              ? 'Your free trial has ended. Please subscribe to continue using all features.'
              : 'Your subscription has expired. Please renew to continue using all features.'}
          </p>
        </div>
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => router.push('/subscription')}
        >
          <CreditCard className="w-4 h-4" />
          {isTrialExpired ? 'Subscribe Now' : 'Renew Subscription'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Redirecting to subscription page...
        </p>
      </div>
    </div>
  );
}

// Hook to check if subscription is required for the current action
export function useSubscriptionCheck() {
  const { isSubscriptionValid, isTrialExpired, isSubscriptionExpired, daysRemaining } = useSubscription();
  const router = useRouter();

  const requireSubscription = (callback: () => void) => {
    if (!isSubscriptionValid) {
      router.push('/subscription');
      return;
    }
    callback();
  };

  return {
    isSubscriptionValid,
    isTrialExpired,
    isSubscriptionExpired,
    daysRemaining,
    requireSubscription,
  };
}
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutContent } from '@/components/layout-content';
import { useAuth } from '@/contexts/auth-context';
import { SubscriptionGuard } from '@/components/subscription-guard';
import { SubscriptionProvider } from '@/contexts/subscription-context';
import Cookies from 'js-cookie';

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Also check for cookie directly as a fallback during navigation
    const hasToken = !!Cookies.get('access_token');
    if (!isLoading && !isAuthenticated && !hasToken) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background text-foreground dark:text-foreground">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children if not authenticated (redirect in progress)
  // Also check for cookie as a fallback to prevent flicker during navigation
  const hasToken = !!Cookies.get('access_token');
  if (!isAuthenticated && !hasToken) {
    return null;
  }

  return (
    <SubscriptionProvider>
      <SubscriptionGuard>
        <LayoutContent>
          {children}
        </LayoutContent>
      </SubscriptionGuard>
    </SubscriptionProvider>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedContent>
      {children}
    </ProtectedContent>
  );
}

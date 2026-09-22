"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import InventoryPOSLanding from "./landing-page";
import Cookies from "js-cookie";
import { PageSkeleton } from "@/components/ui/page-primitives";

export default function Page() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect authenticated users, allow unauthenticated users to see landing page
    if (!isLoading && isAuthenticated) {
      // Get user's preferred landing page or default based on role
      const preferredPage = Cookies.get('preferred_landing_page');
      
      let targetPage = '/dashboard'; // Default for owners/admins
      
      if (user?.role === 'staff' && preferredPage) {
        targetPage = `/${preferredPage}`;
      }
      
      router.push(targetPage);
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="min-h-screen bg-background p-8"><PageSkeleton /></div>;
  }

  // Show landing page for unauthenticated users
  // Authenticated users will be redirected by the useEffect above
  return <InventoryPOSLanding />;
}

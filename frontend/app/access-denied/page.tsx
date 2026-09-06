"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { XCircle, Home, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { permissionsService } from "@/lib/permissions-service";
import { PermissionModuleType, UserRole } from "@/lib/types";

export default function AccessDeniedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [safePage, setSafePage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Find a safe page the user can access
  useEffect(() => {
    const findSafePage = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Owners and admins go to dashboard
        if (user.role === UserRole.OWNER || user.role === UserRole.ADMIN) {
          setSafePage('/dashboard');
          setIsLoading(false);
          return;
        }

        // For staff, check permissions in priority order
        const modulesPriority = [
          PermissionModuleType.POS,
          PermissionModuleType.DASHBOARD,
          PermissionModuleType.INVENTORY,
          PermissionModuleType.ORDERS,
          PermissionModuleType.CUSTOMERS,
          PermissionModuleType.REPORTS,
          PermissionModuleType.SUPPLIERS,
          PermissionModuleType.EXPENSES,
          PermissionModuleType.DELIVERY,
          PermissionModuleType.SETTINGS,
          PermissionModuleType.PAYMENTS,
        ];

        const moduleToRoute: Record<PermissionModuleType, string> = {
          [PermissionModuleType.POS]: '/pos',
          [PermissionModuleType.INVENTORY]: '/inventory',
          [PermissionModuleType.CUSTOMERS]: '/customers',
          [PermissionModuleType.ORDERS]: '/orders',
          [PermissionModuleType.EXPENSES]: '/expenses',
          [PermissionModuleType.REPORTS]: '/reports',
          [PermissionModuleType.SETTINGS]: '/settings',
          [PermissionModuleType.DELIVERY]: '/delivery',
          [PermissionModuleType.SUPPLIERS]: '/suppliers',
          [PermissionModuleType.PAYMENTS]: '/payments',
          [PermissionModuleType.DASHBOARD]: '/dashboard',
          [PermissionModuleType.INVOICES]: '/invoices',
        };

        // Check each module in priority order
        for (const module of modulesPriority) {
          const hasPermission = await permissionsService.checkUserPermission(
            user.id,
            module,
            'view'
          );
          
          if (hasPermission) {
            setSafePage(moduleToRoute[module]);
            setIsLoading(false);
            return;
          }
        }
        
        // If no permissions found, fallback to POS
        setSafePage('/pos');
      } catch (error) {
        console.error('Error finding safe page:', error);
        // Fallback to POS if there's an error
        setSafePage('/pos');
      } finally {
        setIsLoading(false);
      }
    };

    findSafePage();
  }, [user]);

  // After finding a safe page, redirect after a short delay
  useEffect(() => {
    if (!isLoading && safePage) {
      const timer = setTimeout(() => {
        router.push(safePage);
      }, 5000); // 5 seconds - shorter than before

      return () => clearTimeout(timer);
    }
  }, [router, safePage, isLoading]);

  const handleGoToSafePage = () => {
    if (safePage) {
      router.push(safePage);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full mx-auto text-center space-y-6">
        <XCircle className="h-20 w-20 text-destructive mx-auto" />
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
          {user?.role === 'staff' && (
            <p className="text-sm text-muted-foreground mt-2">
              Contact your organization owner to request access to this feature.
            </p>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 mt-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Finding a safe page for you...</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
            <Button onClick={handleGoToSafePage} className="gap-2" disabled={!safePage}>
              <Home className="h-4 w-4" />
              {safePage === '/pos' ? 'Go to POS' :
               safePage === '/dashboard' ? 'Go to Dashboard' :
               safePage === '/inventory' ? 'Go to Inventory' :
               safePage === '/orders' ? 'Go to Orders' :
               'Go to Safe Page'}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        )}
        
        {!isLoading && safePage && (
          <p className="text-xs text-muted-foreground mt-8">
            You'll be automatically redirected in a few seconds...
          </p>
        )}
      </div>
    </div>
  );
}

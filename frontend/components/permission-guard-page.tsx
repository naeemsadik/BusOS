import { PermissionModuleType, UserRole } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { permissionsService } from "@/lib/permissions-service";
import { Loader2 } from "lucide-react";

interface PermissionGuardPageProps {
  module: PermissionModuleType;
  action?: 'view' | 'create' | 'edit' | 'delete';
  children: ReactNode;
  fallback?: ReactNode;
}

// This component is meant to be used at the page level to restrict access to entire pages
export default function PermissionGuardPage({
  module,
  action = 'view', // Default is view since most pages need view permission
  children,
  fallback,
}: PermissionGuardPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user?.id) {
        return;
      }

      try {
        setIsLoading(true);
        
        // Owners and admins always have permission to everything
        if (user.role === UserRole.OWNER || user.role === UserRole.ADMIN) {
          setHasPermission(true);
          return;
        }
        
        // For other roles, check with backend
        const result = await permissionsService.checkUserPermission(user.id, module, action);
        setHasPermission(result);
        
        if (!result) {
          // Instead of showing access-denied, find the first permitted page and redirect
          await redirectToFirstPermittedPage();
        }
      } catch (error) {
        console.error("Failed to check permissions:", error);
        setHasPermission(false);
        // On error, try to redirect to a safe page
        await redirectToFirstPermittedPage();
      } finally {
        setIsLoading(false);
      }
    };

    const redirectToFirstPermittedPage = async () => {
      if (!user?.id) return;
      
      try {
        // Module priority order (Orders is high priority)
        const modulesPriority = [
          PermissionModuleType.POS,
          PermissionModuleType.ORDERS,      // Orders is now 2nd priority
          PermissionModuleType.INVENTORY,
          PermissionModuleType.CUSTOMERS,
          PermissionModuleType.DASHBOARD,
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
        for (const checkModule of modulesPriority) {
          const hasPermission = await permissionsService.checkUserPermission(
            user.id,
            checkModule,
            'view'
          );
          
          if (hasPermission) {
            const targetRoute = moduleToRoute[checkModule];
            toast({
              title: "Redirected",
              description: `Redirecting to ${checkModule} page - you have access there.`,
              variant: "default",
            });
            router.push(targetRoute);
            return;
          }
        }
        
        // If no permissions found, fallback to POS (least restrictive)
        toast({
          title: "Limited Access",
          description: "You have limited permissions. Contact your admin for more access.",
          variant: "destructive",
        });
        router.push('/pos');
      } catch (error) {
        console.error('Error finding permitted page:', error);
        // Final fallback
        router.push('/pos');
      }
    };

    checkPermission();
  }, [user?.id, module, action, toast, router, user?.role]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // If no permission, show loading while redirecting
  if (hasPermission === false) {
    if (fallback) {
      return fallback;
    }
    
    // Show loading while redirecting to permitted page
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Finding a page you can access...</p>
        </div>
      </div>
    );
  }

  // If has permission, render children
  return <>{children}</>;
}

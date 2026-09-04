import { useAuth } from '@/contexts/auth-context';
import { UserRole, PermissionModuleType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { permissionsService } from '@/lib/permissions-service';

interface UsePermissionGuardProps {
  module: PermissionModuleType;
  action: 'view' | 'create' | 'edit' | 'delete';
  redirectTo?: string;
}

export function usePermissionGuard({ 
  module, 
  action, 
  redirectTo = '/' 
}: UsePermissionGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      if (isLoading) return;
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Owners have all permissions
      if (user.role === UserRole.OWNER) {
        setHasPermission(true);
        setPermissionChecked(true);
        return;
      }

      try {
        // Make a real API call to check permission
        const hasModulePermission = await permissionsService.checkUserPermission(
          user.id,
          module,
          action
        );
        
        setHasPermission(hasModulePermission);
        
        if (!hasModulePermission) {
          toast.error(`You don't have permission to ${action} in the ${module} module`);
          router.push(redirectTo);
        }
        
        setPermissionChecked(true);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasPermission(false);
        toast.error('Failed to verify permissions');
        router.push(redirectTo);
      }
    };

    checkPermission();
  }, [user, isLoading, module, action, redirectTo, router]);

  return { hasPermission, permissionChecked, isLoading: isLoading || !permissionChecked };
}

'use client';

import { useEffect, useState } from 'react';
import { UserRole, PermissionModuleType } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { permissionsService } from '@/lib/permissions-service';

interface UseNavPermissionsProps {
  userId: string;
  role: UserRole;
}

interface ModulePermissions {
  [module: string]: boolean;
}

export function useNavPermissions({ userId, role }: UseNavPermissionsProps) {
  const [modulePermissions, setModulePermissions] = useState<ModulePermissions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      
      try {
        // Owners have access to everything
        if (role === UserRole.OWNER) {
          const allPermissions = Object.values(PermissionModuleType).reduce((acc, module) => {
            acc[module] = true;
            return acc;
          }, {} as ModulePermissions);
          
          setModulePermissions(allPermissions);
        } else {
          // For staff, fetch their view permissions for each module
          const permissionPromises = Object.values(PermissionModuleType).map(async (module) => {
            const hasPermission = await permissionsService.checkUserPermission(userId, module, 'view');
            return { module, hasPermission };
          });
          
          const results = await Promise.all(permissionPromises);
          
          const permissions = results.reduce((acc, { module, hasPermission }) => {
            acc[module] = hasPermission;
            return acc;
          }, {} as ModulePermissions);
          
          setModulePermissions(permissions);
        }
      } catch (error) {
        console.error('Error fetching navigation permissions:', error);
        // Default to showing nothing on error
        setModulePermissions({});
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPermissions();
    }
  }, [userId, role]);

  return { modulePermissions, loading };
}

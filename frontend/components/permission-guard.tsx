'use client';

import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { PermissionModuleType } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

interface PermissionGuardProps {
  module: PermissionModuleType;
  action: 'view' | 'create' | 'edit' | 'delete';
  redirectTo?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

// A component that renders its children only if the user has the required permission
export default function PermissionGuard({
  module,
  action,
  redirectTo = '/',
  children,
  fallback,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = usePermissionGuard({
    module,
    action,
    redirectTo,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-2 text-sm text-gray-500">Checking permissions...</p>
      </div>
    );
  }

  if (!hasPermission) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center min-h-[200px] border rounded-lg bg-gray-50 p-4">
        <p className="text-gray-600">You don't have permission to access this content.</p>
      </div>
    );
  }

  return <>{children}</>;
}

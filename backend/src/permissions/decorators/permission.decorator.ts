import { SetMetadata } from '@nestjs/common';
import { PermissionModuleType } from '../../entities';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

export const RequiredPermission = (
  module: PermissionModuleType, 
  action: 'view' | 'create' | 'edit' | 'delete'
) => SetMetadata(REQUIRED_PERMISSION_KEY, { module, action });

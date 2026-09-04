import { api } from './api';
import { PermissionModuleType, UserPermission } from './types';
import { PermissionPayload, permissionToPayload } from './permission-helpers';

class PermissionsService {
  // Get permissions for a specific user
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    const response = await api.get(`/permissions/user/${userId}`);
    return response.data;
  }

  // Update a user's permission for a specific module
  async updatePermission(
    userId: string, 
    module: PermissionModuleType, 
    permission: PermissionPayload
  ): Promise<UserPermission> {
    const response = await api.post(`/permissions/user/${userId}/module/${module}`, permission);
    return response.data;
  }

  // Delete a user's permission for a specific module
  async deletePermission(userId: string, module: PermissionModuleType): Promise<void> {
    await api.delete(`/permissions/user/${userId}/module/${module}`);
  }

  // Get all users with their permissions for a specific module
  async getModulePermissions(module: PermissionModuleType): Promise<{ userId: string; user: any; permission: UserPermission }[]> {
    const response = await api.get(`/permissions/module/${module}`);
    return response.data;
  }
  
  // Check if a user has specific permission for a module
  async checkUserPermission(
    userId: string,
    module: PermissionModuleType,
    action: 'view' | 'create' | 'edit' | 'delete'
  ): Promise<boolean> {
    try {
      const response = await api.get(`/permissions/check/${userId}/${module}/${action}`);
      return response.data.hasPermission;
    } catch (error) {
      console.error('Error checking user permission:', error);
      return false;
    }
  }
}

export const permissionsService = new PermissionsService();

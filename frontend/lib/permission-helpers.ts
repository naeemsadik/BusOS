import { UserPermission, PermissionModuleType } from './types';

export interface PermissionPayload {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export const permissionToPayload = (permission: UserPermission): PermissionPayload => {
  return {
    view: permission.canView,
    create: permission.canCreate,
    edit: permission.canEdit,
    delete: permission.canDelete,
  };
};

export const payloadToPermission = (
  payload: PermissionPayload,
  userId: string,
  module: PermissionModuleType
): Partial<UserPermission> => {
  return {
    userId,
    module,
    canView: payload.view,
    canCreate: payload.create,
    canEdit: payload.edit,
    canDelete: payload.delete,
  };
};

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPermission, PermissionModuleType, User, UserRole } from '../entities';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(UserPermission)
    private permissionRepository: Repository<UserPermission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    return this.permissionRepository.find({ where: { userId } });
  }

  async createOrUpdatePermission(userId: string, module: PermissionModuleType, permissions: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
  }): Promise<UserPermission> {
    // First, ensure the user exists and is not an owner
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('Cannot modify permissions for owners');
    }

    // Look for existing permission for this module
    let permission = await this.permissionRepository.findOne({
      where: { userId, module },
    });

    // Map the input properties to entity properties
    const permissionData = {
      canView: permissions.view,
      canCreate: permissions.create,
      canEdit: permissions.edit,
      canDelete: permissions.delete,
    };

    if (permission) {
      // Update existing permission
      Object.assign(permission, permissionData);
    } else {
      // Create new permission
      permission = this.permissionRepository.create({
        userId,
        module,
        ...permissionData,
      });
    }

    return this.permissionRepository.save(permission);
  }

  async deletePermission(userId: string, module: PermissionModuleType): Promise<void> {
    const result = await this.permissionRepository.delete({ userId, module });
    if (result.affected === 0) {
      throw new NotFoundException(`Permission not found for user ${userId} and module ${module}`);
    }
  }

  async hasPermission(userId: string, module: PermissionModuleType, action: 'view' | 'create' | 'edit' | 'delete'): Promise<boolean> {
    // First check if the user is an owner, owners have all permissions
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return false;
    
    if (user.role === UserRole.OWNER) return true;

    const permission = await this.permissionRepository.findOne({
      where: { userId, module },
    });

    if (!permission) return false;

    switch (action) {
      case 'view':
        return permission.canView;
      case 'create':
        return permission.canCreate;
      case 'edit':
        return permission.canEdit;
      case 'delete':
        return permission.canDelete;
      default:
        return false;
    }
  }

  async initializeDefaultPermissions(userId: string): Promise<void> {
    // This method will set default permissions for a new staff user
    const modules = Object.values(PermissionModuleType);
    
    for (const module of modules) {
      await this.createOrUpdatePermission(userId, module, {
        view: false,
        create: false,
        edit: false,
        delete: false,
      });
    }
  }

  async getModulePermissions(organizationId: string, module: PermissionModuleType): Promise<{ userId: string; user: User; permission: UserPermission }[]> {
    // Get all staff users from the organization
    const users = await this.userRepository.find({
      where: { 
        organizationId,
        role: UserRole.STAFF 
      },
    });

    const result: { userId: string; user: User; permission: UserPermission }[] = [];

    for (const user of users) {
      const permission = await this.permissionRepository.findOne({
        where: { userId: user.id, module },
      }) || this.permissionRepository.create({
        userId: user.id,
        module,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      });

      result.push({ userId: user.id, user, permission });
    }

    return result;
  }
}

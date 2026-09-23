import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PermissionModuleType, UserRole } from '../entities';
import { PermissionsService } from './permissions.service';

describe('PermissionsService tenant boundaries', () => {
  const permissionRepository = {
    create: jest.fn((value) => value),
    delete: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const userRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };
  let service: PermissionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionsService(permissionRepository as never, userRepository as never);
  });

  it('does not expose permissions for a user outside the organization', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.getUserPermissions('foreign-user', 'current-organization')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(permissionRepository.find).not.toHaveBeenCalled();
  });

  it('does not allow owner permissions to be changed', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'owner', role: UserRole.OWNER });

    await expect(
      service.createOrUpdatePermission('owner', 'organization', PermissionModuleType.HRM, { view: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates disabled HRM access for staff when requested', async () => {
    userRepository.findOne.mockResolvedValue({ id: 'staff', role: UserRole.STAFF });
    permissionRepository.findOne.mockResolvedValue(null);

    const permission = await service.createOrUpdatePermission(
      'staff',
      'organization',
      PermissionModuleType.HRM,
      { view: false, create: false, edit: false, delete: false },
    );

    expect(permissionRepository.create).toHaveBeenCalledWith({
      userId: 'staff',
      module: PermissionModuleType.HRM,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    });
    expect(permission).toMatchObject({ userId: 'staff', module: PermissionModuleType.HRM, canView: false });
  });
});

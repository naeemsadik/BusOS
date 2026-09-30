import { NotFoundException } from '@nestjs/common';
import { TenantScope } from './tenant-scope';

describe('TenantScope', () => {
  const scope = new TenantScope();

  it('always places the token organization in the repository predicate', () => {
    expect(scope.where('org-a', { id: 'page-a' })).toEqual({ id: 'page-a', organizationId: 'org-a' });
  });

  it('rejects a foreign identifier without revealing whether it exists', async () => {
    const repository = { findOne: jest.fn().mockResolvedValue(null) } as any;
    await expect(scope.require(repository, 'org-a', { id: 'foreign-page' }, 'Page')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'foreign-page', organizationId: 'org-a' } });
  });
});

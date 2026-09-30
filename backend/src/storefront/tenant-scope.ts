import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';

/** Centralizes the non-negotiable organization predicate for CMS entities. */
@Injectable()
export class TenantScope {
  where<T extends ObjectLiteral>(organizationId: string, extra: Partial<T> = {}) {
    return { ...extra, organizationId } as FindOptionsWhere<T>;
  }

  async require<T extends ObjectLiteral & { organizationId: string }>(
    repository: Repository<T>,
    organizationId: string,
    extra: Partial<T>,
    label: string,
  ) {
    const row = await repository.findOne({
      where: this.where<T>(organizationId, extra),
    });
    if (!row) throw new NotFoundException(`${label} not found`);
    return row;
  }
}

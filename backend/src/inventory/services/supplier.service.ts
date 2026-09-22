import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Supplier, Organization } from '../../entities';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
  BulkDeleteSuppliersDto,
  UpdateSupplierStatsDto,
} from '../dto';

@Injectable()
export class SupplierService {
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
    organization: Organization,
  ): Promise<Supplier> {
    const existingSupplier = await this.supplierRepository.findOne({
      where: {
        email: createSupplierDto.email,
        organization: { id: organization.id },
      },
    });

    if (existingSupplier) {
      throw new ConflictException('Supplier with this email already exists');
    }

    const supplier = this.supplierRepository.create({
      ...createSupplierDto,
      organization,
    });

    return await this.supplierRepository.save(supplier);
  }

  async findAll(
    query: SupplierQueryDto,
    organization: Organization,
  ): Promise<{
    data: Supplier[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    filters: {
      categories: string[];
    };
  }> {
    const { search, category, status, minTotalAmount, maxTotalAmount, page, limit, sortBy, sortOrder } = query;
    
    const queryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.organization = :organizationId', {
        organizationId: organization.id,
      });

    // Search filter
    if (search) {
      const escapedSearch = this.escapeLikePattern(search);
      queryBuilder.andWhere(
        '(supplier.name ILIKE :search ESCAPE \'\\\' OR supplier.company ILIKE :search ESCAPE \'\\\' OR supplier.email ILIKE :search ESCAPE \'\\\' OR supplier.category ILIKE :search ESCAPE \'\\\')',
        { search: '%' + escapedSearch + '%' }
      );
    }

    // Category filter
    if (category) {
      queryBuilder.andWhere('supplier.category = :category', { category });
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('supplier.status = :status', { status });
    }

    // Total amount range filter
    if (minTotalAmount !== undefined) {
      queryBuilder.andWhere('supplier.totalAmount >= :minTotalAmount', { minTotalAmount });
    }
    if (maxTotalAmount !== undefined) {
      queryBuilder.andWhere('supplier.totalAmount <= :maxTotalAmount', { maxTotalAmount });
    }

    // Get filter options for frontend
    const filterQueryBuilder = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.organization = :organizationId', {
        organizationId: organization.id,
      });

    const categoriesResult = await filterQueryBuilder
      .select('DISTINCT supplier.category', 'category')
      .andWhere('supplier.category IS NOT NULL')
      .andWhere('supplier.category != :empty', { empty: '' })
      .orderBy('supplier.category', 'ASC')
      .getRawMany();

    // Sorting
    const sortFieldMap: Record<string, string> = {
      name: 'supplier.name',
      company: 'supplier.company',
      email: 'supplier.email',
      category: 'supplier.category',
      totalAmount: 'supplier.totalAmount',
      outstandingAmount: 'supplier.outstandingAmount',
      lastOrderDate: 'supplier.lastOrderDate',
      createdAt: 'supplier.createdAt',
    };
    const sortColumn = sortFieldMap[sortBy ?? 'name'] ?? sortFieldMap.name;
    const normalizedSortOrder = (sortOrder ?? 'ASC').toUpperCase();
    const safeSortOrder: 'ASC' | 'DESC' = normalizedSortOrder === 'DESC' ? 'DESC' : 'ASC';
    queryBuilder.orderBy(sortColumn, safeSortOrder);

    // Pagination
    const currentPage = page || 1;
    const currentLimit = Math.min(limit || 10, 100);
    const skip = (currentPage - 1) * currentLimit;
    queryBuilder.skip(skip).take(currentLimit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit),
      filters: {
        categories: categoriesResult.map(item => item.category),
      },
    };
  }

  async findOne(id: string, organization: Organization): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, organization: { id: organization.id } },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
    organization: Organization,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id, organization);

    if (updateSupplierDto.email && updateSupplierDto.email !== supplier.email) {
      const existingSupplier = await this.supplierRepository.findOne({
        where: {
          email: updateSupplierDto.email,
          organization: { id: organization.id },
        },
      });

      if (existingSupplier) {
        throw new ConflictException('Supplier with this email already exists');
      }
    }

    Object.assign(supplier, updateSupplierDto);
    return await this.supplierRepository.save(supplier);
  }

  async remove(id: string, organization: Organization): Promise<void> {
    const supplier = await this.findOne(id, organization);
    await this.supplierRepository.remove(supplier);
  }

  async bulkDelete(
    bulkDeleteDto: BulkDeleteSuppliersDto,
    organization: Organization,
  ): Promise<{ deleted: number }> {
    const suppliers = await this.supplierRepository.find({
      where: {
        id: In(bulkDeleteDto.supplierIds),
        organization: { id: organization.id },
      },
    });

    await this.supplierRepository.remove(suppliers);

    return { deleted: suppliers.length };
  }

  async updateStats(
    id: string,
    updateStatsDto: UpdateSupplierStatsDto,
    organization: Organization,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id, organization);
    
    Object.assign(supplier, updateStatsDto);
    return await this.supplierRepository.save(supplier);
  }

  async getSupplierStats(organization: Organization): Promise<{
    totalSuppliers: number;
    activeSuppliers: number;
    totalPurchases: number;
    outstandingAmount: number;
    categories: string[];
  }> {
    const suppliers = await this.supplierRepository.find({
      where: { organization: { id: organization.id } },
    });

    const totalSuppliers = suppliers.length;
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const totalPurchases = suppliers.reduce((sum, supplier) => sum + Number(supplier.totalPurchases || supplier.totalAmount || 0), 0);
    const outstandingAmount = suppliers.reduce((sum, supplier) => sum + Number(supplier.outstandingAmount || 0), 0);
    const categories = [...new Set(suppliers.map(s => s.category).filter(Boolean))];

    return {
      totalSuppliers,
      activeSuppliers,
      totalPurchases,
      outstandingAmount,
      categories,
    };
  }

  async getSupplierCategories(organization: Organization): Promise<string[]> {
    const result = await this.supplierRepository
      .createQueryBuilder('supplier')
      .select('DISTINCT supplier.category', 'category')
      .where('supplier.organization = :organizationId', {
        organizationId: organization.id,
      })
      .andWhere('supplier.category IS NOT NULL')
      .andWhere('supplier.category != :empty', { empty: '' })
      .orderBy('supplier.category', 'ASC')
      .getRawMany();

    return result.map(item => item.category);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Product, StockMovement, Organization, StockMovementType, User } from '../../entities';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  BulkDeleteDto,
  StockAdjustmentDto,
} from '../dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(StockMovement)
    private stockMovementRepository: Repository<StockMovement>,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    organization: Organization,
  ): Promise<Product> {
    // Enforce uniqueness only when the optional SKU was supplied.
    if (createProductDto.sku) {
      const existingSku = await this.productRepository.findOne({
        where: {
          sku: createProductDto.sku,
          organization: { id: organization.id },
        },
      });

      if (existingSku) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    const product = this.productRepository.create({
      ...createProductDto,
      sku: createProductDto.sku ?? null,
      organization,
    });

    const savedProduct = await this.productRepository.save(product);

    // Create initial stock movement if stock is provided
    if (createProductDto.stock && createProductDto.stock > 0) {
      await this.createStockMovement({
        product: savedProduct,
        type: StockMovementType.ADJUSTMENT,
        quantity: createProductDto.stock,
        previousStock: 0,
        newStock: createProductDto.stock,
        notes: 'Initial stock',
        organization,
      });
    }

    return savedProduct;
  }

  async findAll(
    query: ProductQueryDto,
    organization: Organization,
  ): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    filters: {
      categories: string[];
      brands: string[];
      suppliers: string[];
    };
  }> {
    const {
      search,
      category,
      brand,
      supplier,
      status,
      stockStatus,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      page,
      limit,
      sortBy,
      sortOrder,
    } = query;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.organization = :organizationId', {
        organizationId: organization.id,
      });

    // Search filter - enhanced to search across multiple fields
    if (search) {
      const escapedSearch = this.escapeLikePattern(search);
      queryBuilder.andWhere(
        '(product.name ILIKE :search ESCAPE \'\\\' OR product.sku ILIKE :search ESCAPE \'\\\' OR product.description ILIKE :search ESCAPE \'\\\' OR product.brand ILIKE :search ESCAPE \'\\\' OR product.supplier ILIKE :search ESCAPE \'\\\')',
        { search: '%' + escapedSearch + '%' }
      );
    }

    // Category filter
    if (category) {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    // Brand filter
    if (brand) {
      queryBuilder.andWhere('product.brand = :brand', { brand });
    }

    // Supplier filter
    if (supplier) {
      queryBuilder.andWhere('product.supplier = :supplier', { supplier });
    }

    // Price range filter
    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    // Stock range filter
    if (minStock !== undefined) {
      queryBuilder.andWhere('product.stock >= :minStock', { minStock });
    }
    if (maxStock !== undefined) {
      queryBuilder.andWhere('product.stock <= :maxStock', { maxStock });
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('product.status = :status', { status });
    }

    // Stock status filter with more precise conditions
    if (stockStatus) {
      switch (stockStatus) {
        case 'out_of_stock':
          queryBuilder.andWhere('product.stock = 0');
          break;
        case 'low_stock':
          queryBuilder.andWhere('product.stock > 0 AND product.stock <= product.minStock');
          break;
        case 'in_stock':
          queryBuilder.andWhere('product.stock > product.minStock');
          break;
      }
    }

    // Get filter options for frontend
    const filterQueryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.organization = :organizationId', {
        organizationId: organization.id,
      });

    const [categoriesResult, brandsResult, suppliersResult] = await Promise.all([
      filterQueryBuilder
        .select('DISTINCT product.category', 'category')
        .andWhere('product.category IS NOT NULL')
        .andWhere('product.category != :empty', { empty: '' })
        .orderBy('product.category', 'ASC')
        .getRawMany(),
      filterQueryBuilder
        .select('DISTINCT product.brand', 'brand')
        .andWhere('product.brand IS NOT NULL')
        .andWhere('product.brand != :empty', { empty: '' })
        .orderBy('product.brand', 'ASC')
        .getRawMany(),
      filterQueryBuilder
        .select('DISTINCT product.supplier', 'supplier')
        .andWhere('product.supplier IS NOT NULL')
        .andWhere('product.supplier != :empty', { empty: '' })
        .orderBy('product.supplier', 'ASC')
        .getRawMany(),
    ]);

    // Sorting
    const sortFieldMap: Record<string, string> = {
      name: 'product.name',
      sku: 'product.sku',
      price: 'product.price',
      cost: 'product.cost',
      stock: 'product.stock',
      category: 'product.category',
      brand: 'product.brand',
      createdAt: 'product.createdAt',
      updatedAt: 'product.updatedAt',
    };
    const sortColumn = sortFieldMap[sortBy ?? 'name'] ?? sortFieldMap.name;
    const normalizedSortOrder = (sortOrder ?? 'ASC').toUpperCase();
    const safeSortOrder: 'ASC' | 'DESC' = normalizedSortOrder === 'DESC' ? 'DESC' : 'ASC';
    queryBuilder.orderBy(sortColumn, safeSortOrder);

    // Pagination
    const currentPage = page || 1;
    const currentLimit = Math.min(limit || 10, 100); // Max 100 items per page
    const skip = (currentPage - 1) * currentLimit;
    queryBuilder.skip(skip).take(currentLimit);

    const [data, total] = await queryBuilder.getManyAndCount();

    const result = {
      data,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit),
      filters: {
        categories: categoriesResult.map(item => item.category),
        brands: brandsResult.map(item => item.brand),
        suppliers: suppliersResult.map(item => item.supplier),
      },
    };

    return result;
  }

  async findOne(id: string, organization: Organization): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, organization: { id: organization.id } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    organization: Organization,
  ): Promise<Product> {
    const product = await this.findOne(id, organization);

    // Check if SKU is being updated and if it already exists
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.productRepository.findOne({
        where: {
          sku: updateProductDto.sku,
          organization: { id: organization.id },
        },
      });

      if (existingSku) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productRepository.save(product);

    return updatedProduct;
  }

  async remove(id: string, organization: Organization): Promise<void> {
    const product = await this.findOne(id, organization);
    await this.productRepository.remove(product);
  }

  async bulkDelete(
    bulkDeleteDto: BulkDeleteDto,
    organization: Organization,
  ): Promise<{ deleted: number }> {
    try {
      const products = await this.productRepository.find({
        where: {
          id: In(bulkDeleteDto.productIds),
          organization: { id: organization.id },
        },
      });

      if (products.length === 0) {
        throw new BadRequestException('No products found to delete');
      }

      if (products.length !== bulkDeleteDto.productIds.length) {
        throw new BadRequestException('Some selected products were not found');
      }

      await this.productRepository.remove(products);
      return { deleted: products.length };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        'Failed to delete products',
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Failed to delete products');
    }
  }

  async adjustStock(
    stockAdjustmentDto: StockAdjustmentDto,
    organization: Organization,
    user?: User,
  ): Promise<Product> {
    const { productId, quantity, notes, unitCost } = stockAdjustmentDto;
    
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }
    
    const product = await this.findOne(productId, organization);
    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    if (newStock < 0) {
      throw new BadRequestException('Insufficient stock');
    }

    product.stock = newStock;
    const updatedProduct = await this.productRepository.save(product);

    // Create stock movement record
    await this.createStockMovement({
      product: updatedProduct,
      type: StockMovementType.ADJUSTMENT,
      quantity: Math.abs(quantity),
      previousStock,
      newStock,
      notes,
      unitCost,
      organization,
      user,
    });

    return updatedProduct;
  }

  async getCategories(organization: Organization): Promise<string[]> {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.organization = :organizationId', {
        organizationId: organization.id,
      })
      .andWhere('product.category IS NOT NULL')
      .andWhere('product.category != :empty', { empty: '' })
      .orderBy('product.category', 'ASC')
      .getRawMany();

    return result.map(item => item.category);
  }

  async getInventoryStats(organization: Organization): Promise<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    categoriesCount: number;
  }> {
    const products = await this.productRepository.find({
      where: { organization: { id: organization.id } },
    });

    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + product.totalValue, 0);
    const lowStockCount = products.filter(p => p.stockStatus === 'low_stock').length;
    const outOfStockCount = products.filter(p => p.stockStatus === 'out_of_stock').length;
    const categories = new Set(products.map(p => p.category));
    const categoriesCount = categories.size;

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
      categoriesCount,
    };
  }

  async generateBarcode(productId: string, organization: Organization): Promise<string> {
    const product = await this.findOne(productId, organization);
    
    if (product.barcode) {
      return product.barcode;
    }

    // Generate a simple barcode (EAN-13 format simulation)
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const barcode = `${timestamp}${random}`;

    product.barcode = barcode;
    await this.productRepository.save(product);

    return barcode;
  }

  private async createStockMovement(data: {
    product: Product;
    type: StockMovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    notes?: string;
    unitCost?: number;
    organization: Organization;
    user?: User;
  }): Promise<StockMovement> {
    const stockMovement = this.stockMovementRepository.create(data);
    return await this.stockMovementRepository.save(stockMovement);
  }

  async getStockMovements(
    productId: string,
    organization: Organization,
  ): Promise<StockMovement[]> {
    await this.findOne(productId, organization); // Verify product exists

    return await this.stockMovementRepository.find({
      where: {
        product: { id: productId },
        organization: { id: organization.id },
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50 movements
    });
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { Organization } from './organization.entity';

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
}

@Entity('products')
@Index(['organization', 'sku'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategory: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0 })
  minStock: number;

  @Column({ type: 'int', default: 0 })
  maxStock: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  weight: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  weightUnit: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  barcode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image: string;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @Column({ type: 'boolean', default: true })
  trackStock: boolean;

  @Column({ type: 'boolean', default: false })
  allowBackorder: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxRate: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplier: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Organization, (organization) => organization.id, {
    onDelete: 'CASCADE',
  })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property for stock status
  @Expose()
  get stockStatus(): StockStatus {
    if (this.stock === 0) {
      return StockStatus.OUT_OF_STOCK;
    } else if (this.stock <= this.minStock) {
      return StockStatus.LOW_STOCK;
    } else {
      return StockStatus.IN_STOCK;
    }
  }

  // Virtual property for total value
  @Expose()
  get totalValue(): number {
    return Number(this.price) * this.stock;
  }

  // Virtual property for profit margin
  @Expose()
  get profitMargin(): number {
    const profit = Number(this.price) - Number(this.cost);
    return Number(this.price) > 0 ? (profit / Number(this.price)) * 100 : 0;
  }
}

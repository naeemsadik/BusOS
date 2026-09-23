import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';
import { StorefrontSite } from './storefront-site.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  COD = 'cod',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  CREDIT = 'credit',
  COD = 'cod',
}

export enum OrderSource { POS = 'pos', MANUAL = 'manual', STOREFRONT = 'storefront' }

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column({ type: 'enum', enum: OrderSource, default: OrderSource.MANUAL })
  source: OrderSource;

  @ManyToOne(() => StorefrontSite, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'storefrontSiteId' })
  storefrontSite: StorefrontSite | null;

  @Column({ type: 'uuid', nullable: true }) storefrontSiteId: string | null;
  @Column({ type: 'varchar', length: 2, nullable: true }) storefrontLocale: 'en' | 'bn' | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) checkoutIdempotencyKey: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true, select: false }) confirmationTokenHash: string | null;
  @Column({ type: 'timestamp', nullable: true }) confirmationExpiresAt: Date | null;
  @Column({ type: 'timestamp', nullable: true }) stockCommittedAt: Date | null;
  @Column({ type: 'timestamp', nullable: true }) stockRestoredAt: Date | null;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ nullable: true })
  customerPhone: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  shippingCity: string;

  @Column({ nullable: true })
  shippingState: string;

  @Column({ nullable: true })
  shippingZipCode: string;

  @Column({ nullable: true })
  shippingCountry: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ nullable: true })
  courierService: string;

  @Column({ nullable: true })
  paperflyOrderNumber: string;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

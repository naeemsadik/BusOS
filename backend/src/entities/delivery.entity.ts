import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Order } from './order.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
}

export enum DeliveryType {
  STANDARD = 'standard',
  EXPRESS = 'express',
  SAME_DAY = 'same_day',
  PICKUP = 'pickup',
}

@Entity('deliveries')
@Index(['organizationId', 'deliveryNumber']) // Index for efficient delivery number lookup
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  deliveryNumber: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column()
  deliveryAddress: string;

  @Column({ nullable: true })
  deliveryCity: string;

  @Column({ nullable: true })
  deliveryState: string;

  @Column({ nullable: true })
  deliveryZipCode: string;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({
    type: 'enum',
    enum: DeliveryType,
    default: DeliveryType.STANDARD,
  })
  deliveryType: DeliveryType;

  @Column({ type: 'date' })
  estimatedDeliveryDate: Date;

  @Column({ type: 'date', nullable: true })
  actualDeliveryDate: Date;

  @Column({ nullable: true })
  driverName: string;

  @Column({ nullable: true })
  driverPhone: string;

  @Column({ nullable: true })
  vehicleNumber: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ nullable: true })
  courierService: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  deliveryInstructions: string;

  // Courier Service specific fields
  @Column({ nullable: true })
  courierProvider: string; // 'steadfast' | 'pathao' | 'redx'

  @Column({ nullable: true })
  courierConsignmentId: string;

  @Column({ nullable: true })
  courierTrackingCode: string;

  @Column({ nullable: true })
  courierInvoice: string;

  @Column({ nullable: true })
  courierStatus: string;

  // Legacy Steadfast fields (for backward compatibility)
  @Column({ nullable: true })
  steadfastConsignmentId: string;

  @Column({ nullable: true })
  steadfastTrackingCode: string;

  @Column({ nullable: true })
  steadfastInvoice: string;

  @Column({ nullable: true })
  steadfastStatus: string;

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

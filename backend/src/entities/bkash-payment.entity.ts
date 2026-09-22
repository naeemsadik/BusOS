import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Subscription } from './subscription.entity';

@Entity('bkash_payments')
export class BkashPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', unique: true })
  paymentId: string;

  @Column({ name: 'merchant_invoice_number' })
  merchantInvoiceNumber: string;

  @Column({ name: 'trx_id', nullable: true })
  trxId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'BDT' })
  currency: string;

  @Column({ name: 'payer_reference' })
  payerReference: string;

  @Column()
  status: string; // CREATED, COMPLETED, CANCELLED, REFUNDED, etc.

  @Column({ name: 'bkash_url', type: 'text', nullable: true })
  bkashUrl: string;

  @Column({ name: 'callback_url', type: 'text', nullable: true })
  callbackUrl: string;

  @Column({ name: 'payment_create_time', type: 'timestamp', nullable: true })
  paymentCreateTime: Date | null;

  @Column({ name: 'payment_execute_time', type: 'timestamp', nullable: true })
  paymentExecuteTime: Date | null;

  @Column({ name: 'update_time', type: 'timestamp', nullable: true })
  updateTime: Date | null;

  // Refund related fields
  @Column({ name: 'refund_id', nullable: true })
  refundId: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ name: 'refund_time', type: 'timestamp', nullable: true })
  refundTime: Date | null;

  // Relations
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

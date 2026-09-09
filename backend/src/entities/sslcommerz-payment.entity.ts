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

@Entity('sslcommerz_payments')
export class SslcommerzPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tran_id', unique: true })
  tranId: string;

  @Column({ name: 'merchant_invoice_number', nullable: true })
  merchantInvoiceNumber: string;

  @Column({ name: 'val_id', nullable: true })
  valId: string;

  @Column({ name: 'bank_tran_id', nullable: true })
  bankTranId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'BDT' })
  currency: string;

  @Column({ name: 'customer_name', nullable: true })
  customerName: string;

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  status: string; // PENDING, VALID, FAILED, CANCELLED, REFUNDED, etc.

  @Column({ name: 'gateway_page_url', type: 'text', nullable: true })
  gatewayPageUrl: string;

  @Column({ name: 'card_type', nullable: true })
  cardType: string;

  @Column({ name: 'card_no', nullable: true })
  cardNo: string;

  @Column({ name: 'card_issuer', nullable: true })
  cardIssuer: string;

  @Column({ name: 'card_brand', nullable: true })
  cardBrand: string;

  @Column({ name: 'payment_processor', nullable: true })
  paymentProcessor: string;

  @Column({ name: 'risk_level', nullable: true })
  riskLevel: string;

  @Column({ name: 'risk_title', nullable: true })
  riskTitle: string;

  // Refund related fields
  @Column({ name: 'refund_ref_id', nullable: true })
  refundRefId: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ name: 'refund_remarks', type: 'text', nullable: true })
  refundRemarks: string;

  @Column({ name: 'refund_time', type: 'timestamp', nullable: true })
  refundTime: Date | null;

  // Transaction timestamps
  @Column({ name: 'tran_date', type: 'timestamp', nullable: true })
  tranDate: Date | null;

  @Column({ name: 'validation_time', type: 'timestamp', nullable: true })
  validationTime: Date | null;

  // Relations
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  // Response data (store full response as JSON for debugging)
  @Column({ name: 'response_data', type: 'jsonb', nullable: true })
  responseData: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

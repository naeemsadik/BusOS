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
import { BkashPayment } from './bkash-payment.entity';
import { SslcommerzPayment } from './sslcommerz-payment.entity';

export enum SmsPackageStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('sms_packages')
export class SmsPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  packageNumber: string;

  @Column({ type: 'integer' })
  smsCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  pricePerSms: number;

  @Column({
    type: 'enum',
    enum: SmsPackageStatus,
    default: SmsPackageStatus.PENDING,
  })
  status: SmsPackageStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  organizationId: string;

  @ManyToOne(() => BkashPayment, { nullable: true })
  @JoinColumn({ name: 'bkashPaymentId' })
  bkashPayment: BkashPayment;

  @Column({ nullable: true })
  bkashPaymentId: string;

  @ManyToOne(() => SslcommerzPayment, { nullable: true })
  @JoinColumn({ name: 'sslcommerzPaymentId' })
  sslcommerzPayment: SslcommerzPayment;

  @Column({ nullable: true })
  sslcommerzPaymentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

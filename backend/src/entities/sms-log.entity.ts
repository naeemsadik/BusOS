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

export enum SmsType {
  PROMOTIONAL = 'promotional',
  TRANSACTIONAL = 'transactional',
  OTP = 'otp',
  REMINDER = 'reminder',
}

export enum SmsStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity('sms_logs')
export class SmsLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipient: string;

  @Column({ nullable: true })
  recipientName: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: SmsType,
    default: SmsType.TRANSACTIONAL,
  })
  type: SmsType;

  @Column({
    type: 'enum',
    enum: SmsStatus,
    default: SmsStatus.PENDING,
  })
  status: SmsStatus;

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  cost: number;

  @Column({ nullable: true })
  gateway: string;

  @Column({ nullable: true })
  gatewayResponse: string;

  @Column({ nullable: true })
  deliveryReportId: string;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

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

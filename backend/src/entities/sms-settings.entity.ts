import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sms_settings')
export class SmsSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 0.50 })
  pricePerSms: number;

  @Column({ type: 'integer', default: 100 })
  minimumPurchase: number;

  @Column({ type: 'integer', default: 50000 })
  maximumPurchase: number;

  @Column({ type: 'integer', default: 50 })
  lowBalanceThreshold: number;

  @Column({ type: 'integer', default: 10 })
  criticalBalanceThreshold: number;

  @Column({ type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ type: 'varchar', nullable: true })
  defaultGateway: string;

  @Column({ type: 'varchar', nullable: true })
  defaultSenderId: string;

  @Column({ type: 'integer', default: 1000 })
  dailyLimit: number;

  @Column({ type: 'integer', default: 100 })
  rateLimitPerMinute: number;

  @Column({ type: 'boolean', default: true })
  enableDeliveryReports: boolean;

  @Column({ type: 'boolean', default: true })
  honorOptOutRequests: boolean;

  @Column({ type: 'time', default: '09:00:00' })
  sendingStartTime: string;

  @Column({ type: 'time', default: '21:00:00' })
  sendingEndTime: string;

  @Column({ type: 'boolean', default: false })
  restrictSendingHours: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

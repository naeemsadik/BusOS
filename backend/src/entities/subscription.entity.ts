import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { SubscriptionStatus, SubscriptionPlan } from './enums';
import { Organization } from './organization.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.TRIAL,
  })
  plan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  status: SubscriptionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'varchar', nullable: true })
  currency: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  trialEndDate: Date | null;

  @Column({ default: false })
  autoRenew: boolean;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string;

  @Column({ type: 'varchar', nullable: true })
  stripeCustomerId: string;

  @Column({ type: 'varchar', nullable: true })
  stripeSubscriptionId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextPaymentDate: Date | null;

  @Column({ default: false })
  hasUsedTrial: boolean;

  @OneToOne(() => Organization, (organization) => organization.subscription)
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionPlan } from './enums';

@Entity('subscription_plans')
export class SubscriptionPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    unique: true,
  })
  planType: SubscriptionPlan;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  @Column({ type: 'int', default: 30 })
  durationDays: number;

  @Column({ type: 'json', nullable: true })
  features: string[];

  @Column({ type: 'int', nullable: true })
  maxUsers: number;

  @Column({ type: 'int', nullable: true })
  maxInventoryItems: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPopular: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

export enum ExpenseCategory {
  OFFICE_SUPPLIES = 'office_supplies',
  RENT = 'rent',
  UTILITIES = 'utilities',
  MARKETING = 'marketing',
  TRAVEL = 'travel',
  MEALS = 'meals',
  EQUIPMENT = 'equipment',
  SOFTWARE = 'software',
  PROFESSIONAL_SERVICES = 'professional_services',
  INVENTORY = 'inventory',
  SHIPPING = 'shipping',
  TAXES = 'taxes',
  INSURANCE = 'insurance',
  SMS = 'sms',
  OTHER = 'other',
}



@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    default: ExpenseCategory.OTHER,
  })
  category: ExpenseCategory;

  @Column({ type: 'date' })
  expenseDate: Date;

  @Column({ nullable: true })
  vendor: string;

  @Column({ nullable: true })
  receiptUrl: string;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ nullable: true })
  reference: string;

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

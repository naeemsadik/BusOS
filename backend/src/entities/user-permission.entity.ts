import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum PermissionModuleType {
  POS = 'pos',
  INVENTORY = 'inventory',
  CUSTOMERS = 'customers',
  ORDERS = 'orders',
  INVOICES = 'invoices',
  EXPENSES = 'expenses',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  DELIVERY = 'delivery',
  PAYMENTS = 'payments',
  SUPPLIERS = 'suppliers',
  DASHBOARD = 'dashboard',
}

@Entity('user_permissions')
export class UserPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PermissionModuleType,
  })
  module: PermissionModuleType;
  
  @Column({ default: false })
  canView: boolean;

  @Column({ default: false })
  canCreate: boolean;

  @Column({ default: false })
  canEdit: boolean;

  @Column({ default: false })
  canDelete: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

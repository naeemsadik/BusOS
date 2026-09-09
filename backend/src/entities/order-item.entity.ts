import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productId: string;

  @Column()
  productName: string;

  @Column({ nullable: true })
  productSku: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number; // Selling Price per unit

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitCost: number; // Cost Price (inventory input price)

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number; // Total discount amount for this item

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number; // Total = (unitPrice × quantity) - discountAmount

  // Profit calculation: profit = (Selling Price - Discount - Cost Price) × Quantity
  // Where: Selling Price = unitPrice, Discount = discountAmount/quantity, Cost Price = unitCost

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Calculate profit for this order item using: profit = (Selling Price - Discount - Cost Price) × Quantity
  get profit(): number {
    const sellingPrice = Number(this.unitPrice) || 0;
    const discountPerUnit = (Number(this.discountAmount) || 0) / (Number(this.quantity) || 1);
    const costPrice = Number(this.unitCost) || 0;
    const quantity = Number(this.quantity) || 0;
    
    return (sellingPrice - discountPerUnit - costPrice) * quantity;
  }

  // Calculate profit margin percentage
  get profitMargin(): number {
    const revenue = Number(this.unitPrice) * Number(this.quantity);
    return revenue > 0 ? (this.profit / revenue) * 100 : 0;
  }
}

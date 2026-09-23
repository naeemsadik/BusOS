import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Order, OrderStatus, Product } from '../entities';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

@Injectable()
export class OrderInventoryService {
  async transition(orderId: string, organizationId: string, target: OrderStatus, manager: EntityManager) {
    const order = await this.lockOrder(orderId, organizationId, manager);
    if (order.status === target) return order;
    if (!TRANSITIONS[order.status].includes(target)) throw new BadRequestException(`Order cannot move from ${order.status} to ${target}`);
    if (target === OrderStatus.CONFIRMED) await this.commit(order, organizationId, manager);
    if (target === OrderStatus.CANCELLED || target === OrderStatus.RETURNED) await this.restore(order, organizationId, manager);
    order.status = target;
    return manager.save(order);
  }

  async commitById(orderId: string, organizationId: string, manager: EntityManager) {
    const order = await this.lockOrder(orderId, organizationId, manager); await this.commit(order, organizationId, manager); return order;
  }
  async restoreById(orderId: string, organizationId: string, manager: EntityManager) {
    const order = await this.lockOrder(orderId, organizationId, manager); await this.restore(order, organizationId, manager); return order;
  }
  private async lockOrder(orderId: string, organizationId: string, manager: EntityManager) {
    const order = await manager.getRepository(Order).createQueryBuilder('order').setLock('pessimistic_write')
      .leftJoinAndSelect('order.items', 'items').where('order.id = :orderId AND order.organizationId = :organizationId', { orderId, organizationId }).getOne();
    if (!order) throw new NotFoundException('Order not found'); return order;
  }
  private async commit(order: Order, organizationId: string, manager: EntityManager) {
    if (order.stockCommittedAt && !order.stockRestoredAt) return;
    const productIds = [...new Set(order.items.map(item => item.productId).filter(Boolean))].sort();
    const products = productIds.length ? await manager.getRepository(Product).createQueryBuilder('product').setLock('pessimistic_write')
      .where('product.id IN (:...productIds)', { productIds }).andWhere('product.organizationId = :organizationId', { organizationId }).orderBy('product.id', 'ASC').getMany() : [];
    const byId = new Map(products.map(product => [product.id, product]));
    for (const item of order.items) {
      const product = byId.get(item.productId); if (!product) throw new NotFoundException(`Product with ID ${item.productId} not found`);
      if (product.trackStock && !product.allowBackorder && product.stock < item.quantity) throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.stock}, required: ${item.quantity}`);
      if (product.trackStock) product.stock -= item.quantity;
    }
    await manager.save(products); order.stockCommittedAt = new Date(); order.stockRestoredAt = null; await manager.save(order);
  }
  private async restore(order: Order, organizationId: string, manager: EntityManager) {
    if (!order.stockCommittedAt || order.stockRestoredAt) return;
    const productIds = [...new Set(order.items.map(item => item.productId).filter(Boolean))].sort();
    const products = productIds.length ? await manager.getRepository(Product).createQueryBuilder('product').setLock('pessimistic_write')
      .where('product.id IN (:...productIds)', { productIds }).andWhere('product.organizationId = :organizationId', { organizationId }).orderBy('product.id', 'ASC').getMany() : [];
    const byId = new Map(products.map(product => [product.id, product]));
    for (const item of order.items) { const product = byId.get(item.productId); if (product?.trackStock) product.stock += item.quantity; }
    await manager.save(products); order.stockRestoredAt = new Date(); await manager.save(order);
  }
}

import { BadRequestException } from '@nestjs/common';
import { Order, OrderItem, OrderStatus, Product } from '../entities';
import { OrderInventoryService } from './order-inventory.service';

describe('OrderInventoryService characterization', () => {
  const organizationId = 'org-1';

  function harness(stock = 5) {
    const product = {
      id: 'product-1',
      name: 'Rice',
      stock,
      trackStock: true,
      allowBackorder: false,
    } as Product;
    const order = {
      id: 'order-1',
      organizationId,
      status: OrderStatus.PENDING,
      stockCommittedAt: null,
      stockRestoredAt: null,
      items: [{ productId: product.id, quantity: 2 }],
    } as Order;

    const orderQuery = {
      setLock: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => order),
    };
    const productQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [product]),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === OrderItem
          ? { find: jest.fn(async () => order.items) }
          : {
              createQueryBuilder: jest.fn(() =>
                entity === Order ? orderQuery : productQuery,
              ),
            },
      ),
      save: jest.fn(async (value) => value),
    };

    return { manager: manager as never, order, product, orderQuery, productQuery };
  }

  it('commits stock once when a pending order is confirmed', async () => {
    const { manager, order, product, orderQuery, productQuery } = harness();
    const service = new OrderInventoryService();

    await service.transition(
      order.id,
      organizationId,
      OrderStatus.CONFIRMED,
      manager,
    );
    const committedAt = order.stockCommittedAt;
    await service.transition(
      order.id,
      organizationId,
      OrderStatus.CONFIRMED,
      manager,
    );

    expect(product.stock).toBe(3);
    expect(order.status).toBe(OrderStatus.CONFIRMED);
    expect(order.stockCommittedAt).toBe(committedAt);
    expect(order.stockRestoredAt).toBeNull();
    expect(productQuery.getMany).toHaveBeenCalledTimes(1);
    expect(orderQuery.where).toHaveBeenCalledWith(
      'order.id = :orderId AND order.organizationId = :organizationId',
      { orderId: order.id, organizationId },
    );
  });

  it('restores committed stock once when a confirmed order is cancelled', async () => {
    const { manager, order, product, productQuery } = harness();
    const service = new OrderInventoryService();

    await service.transition(
      order.id,
      organizationId,
      OrderStatus.CONFIRMED,
      manager,
    );
    await service.transition(
      order.id,
      organizationId,
      OrderStatus.CANCELLED,
      manager,
    );
    const restoredAt = order.stockRestoredAt;
    await service.transition(
      order.id,
      organizationId,
      OrderStatus.CANCELLED,
      manager,
    );

    expect(product.stock).toBe(5);
    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(order.stockRestoredAt).toBe(restoredAt);
    expect(productQuery.getMany).toHaveBeenCalledTimes(2);
  });

  it('blocks confirmation when tracked stock is insufficient', async () => {
    const { manager, order, product } = harness(1);
    const service = new OrderInventoryService();

    await expect(
      service.transition(
        order.id,
        organizationId,
        OrderStatus.CONFIRMED,
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(product.stock).toBe(1);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.stockCommittedAt).toBeNull();
  });

  it('preserves the existing status transition graph', async () => {
    const { manager, order } = harness();
    const service = new OrderInventoryService();

    await expect(
      service.transition(
        order.id,
        organizationId,
        OrderStatus.SHIPPED,
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

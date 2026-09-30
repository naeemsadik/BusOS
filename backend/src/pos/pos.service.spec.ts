import { OrderSource, OrderStatus, PaymentMethod, Product } from '../entities';
import { PosService } from './pos.service';

describe('PosService createSale characterization', () => {
  it('creates a confirmed POS order and commits inventory immediately', async () => {
    const product = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Rice',
      cost: 40,
    } as Product;
    const savedOrder = { id: 'order-1' };
    const returnedOrder = {
      ...savedOrder,
      status: OrderStatus.CONFIRMED,
      source: OrderSource.POS,
      items: [],
    };
    const productQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [product]),
    };
    let createdOrder: Record<string, unknown> | undefined;
    const manager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => productQuery),
      })),
      create: jest.fn((entity, value) => {
        if ((entity as { name?: string }).name === 'Order') createdOrder = value;
        return value;
      }),
      save: jest.fn(async (value) =>
        Array.isArray(value) ? value : { id: 'order-1', ...value },
      ),
    };
    const orderRepository = {
      count: jest.fn(async () => 0),
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(returnedOrder),
    };
    const orderInventory = { commitById: jest.fn(async () => undefined) };
    const service = new PosService(
      orderRepository as never,
      {} as never,
      {} as never,
      { increment: jest.fn(), update: jest.fn() } as never,
      { transaction: jest.fn(async (callback) => callback(manager)) } as never,
      orderInventory as never,
    );

    const result = await service.createSale(
      {
        customerName: 'Customer',
        items: [
          {
            productId: product.id,
            productName: product.name,
            unitPrice: 50,
            unitCost: 40,
            quantity: 2,
            total: 100,
          },
        ],
        subtotal: 100,
        total: 100,
        paidAmount: 100,
        paymentMethod: PaymentMethod.CASH,
      } as never,
      { id: 'organization-1' } as never,
    );

    expect(createdOrder).toMatchObject({
      status: OrderStatus.CONFIRMED,
      source: OrderSource.POS,
      organizationId: 'organization-1',
    });
    expect(orderInventory.commitById).toHaveBeenCalledTimes(1);
    expect(orderInventory.commitById).toHaveBeenCalledWith(
      'order-1',
      'organization-1',
      manager,
    );
    expect(result).toBe(returnedOrder);
  });
});

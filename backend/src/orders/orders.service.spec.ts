import { OrderStatus } from '../entities';

jest.mock('../delivery/delivery.service', () => ({
  DeliveryService: class DeliveryService {},
}));

import { OrdersService } from './orders.service';

describe('OrdersService manual order characterization', () => {
  it('creates the order and lines without committing stock before confirmation', async () => {
    const product = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Rice',
    };
    const saved = { id: 'order-1', orderNumber: 'ORD-TEST' };
    const finalOrder = {
      ...saved,
      status: OrderStatus.PENDING,
      items: [],
    };
    const orderRepository = {
      count: jest.fn(async () => 0),
      findOne: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(finalOrder),
      create: jest.fn((value) => value),
      save: jest.fn(async () => saved),
    };
    const orderItemRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const orderInventory = {
      transition: jest.fn(),
      commitById: jest.fn(),
      restoreById: jest.fn(),
    };
    const service = new OrdersService(
      orderRepository as never,
      orderItemRepository as never,
      { findOne: jest.fn(async () => product) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      orderInventory as never,
    );
    jest
      .spyOn(service as never, 'createInvoiceFromOrder' as never)
      .mockResolvedValue({} as never);

    const result = await service.create(
      {
        customerName: 'Customer',
        items: [
          {
            productId: product.id,
            productName: product.name,
            unitPrice: 50,
            quantity: 2,
            total: 100,
          },
        ],
        subtotal: 100,
        total: 100,
      },
      { id: 'organization-1' } as never,
    );

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'organization-1' }),
    );
    expect(orderItemRepository.save).toHaveBeenCalledTimes(1);
    expect(orderInventory.commitById).not.toHaveBeenCalled();
    expect(orderInventory.transition).not.toHaveBeenCalled();
    expect(result).toBe(finalOrder);
  });
});

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, DataSource } from 'typeorm';
import { Order, OrderItem, Product, Customer, OrderStatus, PaymentStatus, Organization, Invoice, InvoiceItem, InvoiceStatus, Delivery } from '../entities';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto } from './dto';
import { InvoicesService } from '../invoices/invoices.service';
import { DeliveryService } from '../delivery/delivery.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  @InjectRepository(Delivery)
  private deliveryRepository: Repository<Delivery>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    private invoicesService: InvoicesService,
    private dataSource: DataSource,
    private deliveryService: DeliveryService,
  ) {}

  private async generateUniqueOrderNumber(organizationId: string): Promise<string> {
    // Use the same format as POS service: ORG-ORGID-YYYYMMDD-NNNN
    const orgPrefix = organizationId.slice(-4).toUpperCase();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of orders created today for this organization
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayOrderCount = await this.orderRepository.count({
      where: {
        organizationId,
        createdAt: Between(startOfDay, endOfDay)
      },
    });
    
    // Format: ORD-ORGID-YYYYMMDD-NNNN
    const sequentialNumber = (todayOrderCount + 1).toString().padStart(4, '0');
    const orderNumber = `ORD-${orgPrefix}-${dateStr}-${sequentialNumber}`;
    
    // Double check uniqueness (should be rare, but just in case)
    const existingOrder = await this.orderRepository.findOne({
      where: { orderNumber },
    });
    
    if (existingOrder) {
      // Fallback to timestamp-based unique identifier
      const uniqueSuffix = Date.now().toString().slice(-6);
      return `ORD-${orgPrefix}-${dateStr}-${uniqueSuffix}`;
    }
    
    return orderNumber;
  }

  async create(createOrderDto: CreateOrderDto, organization: Organization): Promise<Order> {

    const orderNumber = await this.generateUniqueOrderNumber(organization.id);

    // Validate products
    for (const item of createOrderDto.items) {
      const product = await this.productRepository.findOne({
        where: { 
          id: item.productId,
          organization: { id: organization.id }
        },
        relations: ['organization'],
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
    }

    // Create order
    const order = this.orderRepository.create({
      orderNumber,
      customerId: createOrderDto.customerId,
      customerName: createOrderDto.customerName,
      customerEmail: createOrderDto.customerEmail,
      customerPhone: createOrderDto.customerPhone,
      subtotal: createOrderDto.subtotal,
      taxAmount: createOrderDto.taxAmount || 0,
      discountAmount: createOrderDto.discountAmount || 0,
      shippingAmount: createOrderDto.shippingAmount || 0,
      total: createOrderDto.total,
      paidAmount: createOrderDto.paidAmount || 0,
      paymentStatus: createOrderDto.paymentStatus || PaymentStatus.PENDING,
      shippingAddress: createOrderDto.shippingAddress,
      shippingCity: createOrderDto.shippingCity,
      shippingState: createOrderDto.shippingState,
      shippingZipCode: createOrderDto.shippingZipCode,
      shippingCountry: createOrderDto.shippingCountry,
      notes: createOrderDto.notes,
      organizationId: organization.id,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items
    for (const item of createOrderDto.items) {
      const orderItem = this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: item.discountAmount || 0,
        total: item.total,
      });

      await this.orderItemRepository.save(orderItem);
    }

    const finalOrder = await this.findOne(savedOrder.id, organization);
    
    // Always try to auto-create invoice from order
    try {
      await this.createInvoiceFromOrder(finalOrder, organization);
      this.logger.log(`Auto-created invoice for order ${finalOrder.orderNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to auto-create invoice: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Still return the order even if invoice creation fails
    }

    return finalOrder;
  }

  async findAll(query: OrderQueryDto, organization: Organization): Promise<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      status,
      paymentStatus,
      customerId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.organizationId = :organizationId', { organizationId: organization.id });

    if (search) {
      const escapedSearch = this.escapeLikePattern(search);
      queryBuilder.andWhere(
        '(order.orderNumber ILIKE :search ESCAPE \'\\\' OR order.customerName ILIKE :search ESCAPE \'\\\' OR order.customerEmail ILIKE :search ESCAPE \'\\\' OR order.customerPhone ILIKE :search ESCAPE \'\\\')',
        { search: '%' + escapedSearch + '%' }
      );
    }

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (paymentStatus) {
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
    }

    if (customerId) {
      queryBuilder.andWhere('order.customerId = :customerId', { customerId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('order.total >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('order.total <= :maxAmount', { maxAmount });
    }

    const total = await queryBuilder.getCount();
    const orders = await queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Add tracking status for orders with tracking numbers
    const ordersWithTracking = await Promise.all(
      orders.map(async (order) => {
        if (order.trackingNumber && order.customerPhone && order.courierService?.toLowerCase() === 'pathao') {
          try {
            const trackingData = await this.deliveryService.trackPathaoDelivery(
              order.trackingNumber,
              order.customerPhone,
              organization
            );
            (order as any).trackingStatus = trackingData.data?.display_status || 'Unknown';
          } catch (error) {
            this.logger.error(
              `Failed to fetch tracking status for order ${order.orderNumber}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            (order as any).trackingStatus = 'Error fetching status';
          }
        }
        return order;
      })
    );

    return {
      orders: ordersWithTracking,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, organization: Organization): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, organizationId: organization.id },
      relations: ['items', 'customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, organization: Organization): Promise<Order> {
    const order = await this.findOne(id, organization);

    // Use a transaction for comprehensive updates
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // If order is being marked as confirmed and was pending, check stock
      if (updateOrderDto.status === OrderStatus.CONFIRMED && order.status === OrderStatus.PENDING) {
        await this.validateAndUpdateStock(order);
      }
      
      // If order with COD payment status is being delivered, automatically mark it as PAID
      if (updateOrderDto.status === OrderStatus.DELIVERED && 
          order.paymentStatus === PaymentStatus.COD) {
        updateOrderDto.paymentStatus = PaymentStatus.PAID;
        this.logger.log(`COD order ${order.orderNumber} delivered and marked as PAID automatically`);
      }

      // Handle payment status synchronization with invoice
      if (updateOrderDto.paymentStatus && updateOrderDto.paymentStatus !== order.paymentStatus) {
        await this.syncPaymentStatusWithInvoice(order, updateOrderDto.paymentStatus, organization);
      }

      // Handle order items update if provided
      if (updateOrderDto.items && updateOrderDto.items.length > 0) {
        // Validate products exist
        for (const item of updateOrderDto.items) {
          const product = await this.productRepository.findOne({
            where: { 
              id: item.productId,
              organization: { id: organization.id }
            },
            relations: ['organization'],
          });

          if (!product) {
            throw new NotFoundException(`Product with ID ${item.productId} not found`);
          }
        }

        // Delete existing order items
        await queryRunner.manager.delete(OrderItem, { orderId: id });

        // Create new order items
        for (const item of updateOrderDto.items) {
          const orderItem = this.orderItemRepository.create({
            orderId: id,
            productId: item.productId,
            productName: item.productName,
            productSku: item.productSku,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            discountAmount: item.discountAmount || 0,
            total: item.total,
          });

          await queryRunner.manager.save(orderItem);
        }
      }

      // Automatically update payment status based on paid amount and new total
      if (updateOrderDto.paidAmount !== undefined) {
        const newPaidAmount = updateOrderDto.paidAmount;
        const newTotal = updateOrderDto.total !== undefined ? updateOrderDto.total : order.total;
        
        let newPaymentStatus: PaymentStatus;
        if (newPaidAmount === 0) {
          newPaymentStatus = PaymentStatus.PENDING;
        } else if (newPaidAmount >= newTotal) {
          newPaymentStatus = PaymentStatus.PAID;
        } else {
          newPaymentStatus = PaymentStatus.PARTIAL;
        }
        
        if (newPaymentStatus !== order.paymentStatus) {
          updateOrderDto.paymentStatus = newPaymentStatus;
          await this.syncPaymentStatusWithInvoice(order, newPaymentStatus, organization);
        }
      }

      // Update the order record (exclude items field)
      const { items, ...orderUpdateData } = updateOrderDto;
      if (Object.keys(orderUpdateData).length > 0) {
        await queryRunner.manager.update(Order, id, orderUpdateData);
      }

      await queryRunner.commitTransaction();

      return this.findOne(id, organization);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, organization: Organization): Promise<void> {
    const order = await this.findOne(id, organization);
    
    // Delete the order and its associated invoice
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete associated invoice if exists
      const invoice = await this.invoiceRepository.findOne({
        where: { orderId: order.id }
      });
      
      if (invoice) {
        await queryRunner.manager.remove(invoice);
      }

      // Delete associated deliveries (if any) to avoid FK constraint violations
      await queryRunner.manager.delete(Delivery, { orderId: order.id });

      // Restore inventory for each order item
      if (order.items) {
        for (const item of order.items) {
          if (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PROCESSING || 
              order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
            await queryRunner.manager.increment(
              Product,
              { id: item.productId },
              'stock',
              item.quantity
            );
          }
        }
      }

      // Delete order items first
      await queryRunner.manager.delete(OrderItem, { orderId: order.id });

      // Delete the order using delete method instead of remove
      await queryRunner.manager.delete(Order, { id: order.id });
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to delete order: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Failed to delete order');
    } finally {
      await queryRunner.release();
    }
  }

  async getOrderStats(organization: Organization): Promise<any> {
    const orders = await this.orderRepository.find({
      where: { organizationId: organization.id },
    });

    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
      confirmed: orders.filter(o => o.status === OrderStatus.CONFIRMED).length,
      processing: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
      shipped: orders.filter(o => o.status === OrderStatus.SHIPPED).length,
      delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
      totalRevenue: orders
        .filter(o => o.paymentStatus === PaymentStatus.PAID)
        .reduce((sum, order) => sum + Number(order.total), 0),
    };

    return stats;
  }

  private async validateAndUpdateStock(order: Order): Promise<void> {
    if (!order.items) {
      const fullOrder = await this.orderRepository.findOne({
        where: { id: order.id },
        relations: ['items'],
      });
      
      if (!fullOrder) {
        throw new NotFoundException('Order not found');
      }
      
      order.items = fullOrder.items;
    }

    for (const item of order.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`
        );
      }

      // Update product stock
      await this.productRepository.decrement(
        { id: item.productId },
        'stock',
        item.quantity
      );
    }
  }

  /**
   * Create an invoice from an order using the InvoicesService
   */
  private async createInvoiceFromOrder(order: Order, organization: Organization): Promise<Invoice> {
    try {
      return await this.invoicesService.createFromOrder(order.id, organization);
    } catch (error) {
      this.logger.error(
        `Failed to create invoice from order: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Sync payment status between order and its corresponding invoice
   */
  private async syncPaymentStatusWithInvoice(order: Order, newPaymentStatus: PaymentStatus, organization: Organization): Promise<void> {
    try {
      // Find the invoice for this order
      const invoice = await this.invoiceRepository.findOne({
        where: { orderId: order.id }
      });

      if (!invoice) {
        this.logger.debug(`No invoice found for order ${order.orderNumber}, skipping payment status sync`);
        return;
      }

      // Map order payment status to invoice status
      let invoiceStatus: InvoiceStatus;
      switch (newPaymentStatus) {
        case PaymentStatus.PAID:
          invoiceStatus = InvoiceStatus.PAID;
          break;
        case PaymentStatus.PENDING:
          invoiceStatus = InvoiceStatus.SENT;
          break;
        case PaymentStatus.FAILED:
        case PaymentStatus.REFUNDED:
          invoiceStatus = InvoiceStatus.CANCELLED;
          break;
        case PaymentStatus.PARTIAL:
          // Keep current status for partial payments, but don't mark as paid
          return;
        default:
          return;
      }

      // Only update if the status is actually different
      if (invoice.status !== invoiceStatus) {
        // Update the invoice status directly to avoid circular calls
        const updateData: any = { 
          status: invoiceStatus
        };
        
        if (invoiceStatus === InvoiceStatus.PAID) {
          updateData.paidDate = new Date().toISOString().split('T')[0];
        }

        await this.invoiceRepository.update(invoice.id, updateData);

        this.logger.log(
          `Synced payment status: Order ${order.orderNumber} (${newPaymentStatus}) -> Invoice ${invoice.invoiceNumber} (${invoiceStatus})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync payment status with invoice: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw error - payment status sync failure shouldn't affect order update
    }
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, InvoiceItem, Customer, Organization, InvoiceStatus, Order, PaymentStatus } from '../entities';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from './dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, organization: Organization): Promise<Invoice> {
    // Validate customer if provided
    if (createInvoiceDto.customerId) {
      const customer = await this.customerRepository.findOne({
        where: { 
          id: createInvoiceDto.customerId,
          organizationId: organization.id,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Generate invoice number
    const invoiceCount = await this.invoiceRepository.count({
      where: { organizationId: organization.id },
    });
    const invoiceNumber = `INV-${(invoiceCount + 1).toString().padStart(6, '0')}`;

    // Create invoice
    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      customerId: createInvoiceDto.customerId,
      customerName: createInvoiceDto.customerName,
      customerEmail: createInvoiceDto.customerEmail,
      customerAddress: createInvoiceDto.customerAddress,
      subtotal: createInvoiceDto.subtotal,
      taxAmount: createInvoiceDto.taxAmount || 0,
      discountAmount: createInvoiceDto.discountAmount || 0,
      total: createInvoiceDto.total,
      issueDate: createInvoiceDto.issueDate,
      dueDate: createInvoiceDto.dueDate,
      notes: createInvoiceDto.notes,
      terms: createInvoiceDto.terms,
      organizationId: organization.id,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create invoice items
    for (const item of createInvoiceDto.items) {
      const invoiceItem = this.invoiceItemRepository.create({
        invoiceId: savedInvoice.id,
        productId: item.productId,
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: item.discountAmount || 0,
        total: item.total,
      });

      await this.invoiceItemRepository.save(invoiceItem);
    }

    return this.findOne(savedInvoice.id, organization);
  }

  async findAll(query: InvoiceQueryDto, organization: Organization): Promise<{
    invoices: Invoice[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      status,
      customerId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .where('invoice.organizationId = :organizationId', { organizationId: organization.id });

    if (search) {
      const escapedSearch = this.escapeLikePattern(search);
      queryBuilder.andWhere(
        '(invoice.invoiceNumber ILIKE :search ESCAPE \'\\\' OR invoice.customerName ILIKE :search ESCAPE \'\\\' OR invoice.customerEmail ILIKE :search ESCAPE \'\\\')',
        { search: '%' + escapedSearch + '%' }
      );
    }

    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }

    if (customerId) {
      queryBuilder.andWhere('invoice.customerId = :customerId', { customerId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('invoice.issueDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('invoice.total >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('invoice.total <= :maxAmount', { maxAmount });
    }

    const total = await queryBuilder.getCount();
    const invoices = await queryBuilder
      .orderBy('invoice.issueDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, organization: Organization): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, organizationId: organization.id },
      relations: ['items', 'customer'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto, organization: Organization): Promise<Invoice> {
    const invoice = await this.findOne(id, organization);

    if (updateInvoiceDto.status === InvoiceStatus.PAID) {
      if (!updateInvoiceDto.paidDate) {
        updateInvoiceDto.paidDate = new Date().toISOString();
      }
      await this.syncStatusWithOrder(invoice, InvoiceStatus.PAID, organization);
    } else if (updateInvoiceDto.status && updateInvoiceDto.status !== invoice.status) {
      // Handle other status changes
      await this.syncStatusWithOrder(invoice, updateInvoiceDto.status, organization);
    }

    await this.invoiceRepository.update(id, updateInvoiceDto);
    return this.findOne(id, organization);
  }

  async remove(id: string, organization: Organization): Promise<void> {
    const invoice = await this.findOne(id, organization);

    // Only allow deletion of draft invoices
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be deleted');
    }

    await this.invoiceRepository.remove(invoice);
  }

  async getInvoiceStats(organization: Organization): Promise<any> {
    const invoices = await this.invoiceRepository.find({
      where: { organizationId: organization.id },
    });

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const overdue = invoices.filter(
      invoice => 
        invoice.status !== InvoiceStatus.PAID && 
        invoice.status !== InvoiceStatus.CANCELLED &&
        new Date(invoice.dueDate) < new Date()
    );

    const stats = {
      total: invoices.length,
      draft: invoices.filter(i => i.status === InvoiceStatus.DRAFT).length,
      sent: invoices.filter(i => i.status === InvoiceStatus.SENT).length,
      viewed: invoices.filter(i => i.status === InvoiceStatus.VIEWED).length,
      paid: invoices.filter(i => i.status === InvoiceStatus.PAID).length,
      overdue: overdue.length,
      cancelled: invoices.filter(i => i.status === InvoiceStatus.CANCELLED).length,
      totalAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0),
      paidAmount: invoices
        .filter(i => i.status === InvoiceStatus.PAID)
        .reduce((sum, invoice) => sum + Number(invoice.total), 0),
      pendingAmount: invoices
        .filter(i => i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.CANCELLED)
        .reduce((sum, invoice) => sum + Number(invoice.total), 0),
      overdueAmount: overdue.reduce((sum, invoice) => sum + Number(invoice.total), 0),
    };

    return stats;
  }

  async markAsSent(id: string, organization: Organization): Promise<Invoice> {
    const invoice = await this.findOne(id, organization);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be marked as sent');
    }

    await this.invoiceRepository.update(id, { status: InvoiceStatus.SENT });
    return this.findOne(id, organization);
  }

  async markAsPaid(id: string, organization: Organization): Promise<Invoice> {
    const invoice = await this.findOne(id, organization);

    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Invoice cannot be marked as paid');
    }

    // Sync with order before updating invoice
    await this.syncStatusWithOrder(invoice, InvoiceStatus.PAID, organization);

    await this.invoiceRepository.update(id, {
      status: InvoiceStatus.PAID,
      paidDate: new Date(),
    });

    return this.findOne(id, organization);
  }

  async getOverdueInvoices(organization: Organization): Promise<Invoice[]> {
    const today = new Date();
    
    return this.invoiceRepository.find({
      where: {
        organizationId: organization.id,
        status: 'sent' as any, // TypeORM issue with enum
      },
      relations: ['customer'],
      order: { dueDate: 'ASC' },
    }).then(invoices => 
      invoices.filter(invoice => new Date(invoice.dueDate) < today)
    );
  }

  async createFromOrder(orderId: string, organization: Organization): Promise<Invoice> {
    this.logger.debug(`Creating invoice from order: ${orderId} for organization: ${organization.id}`);
    
    // Find the order first
    const order = await this.orderRepository.findOne({
      where: { id: orderId, organizationId: organization.id },
      relations: ['items']
    });

    this.logger.debug(`Found order: ${order ? order.orderNumber : 'Not found'}`);

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    
    // Check if invoice already exists for this order
    const existingInvoice = await this.invoiceRepository.findOne({
      where: { orderId: orderId }
    });

    if (existingInvoice) {
      throw new BadRequestException('Invoice already exists for this order');
    }

    this.logger.debug(`Creating invoice for order: ${order.orderNumber}`);

    // Generate invoice number
    const invoiceCount = await this.invoiceRepository.count({
      where: { organizationId: organization.id },
    });
    const invoiceNumber = `INV-${(invoiceCount + 1).toString().padStart(6, '0')}`;

    this.logger.debug(`Generated invoice number: ${invoiceNumber}`);

    // Determine initial invoice status based on order payment status
    let initialStatus = InvoiceStatus.DRAFT;
    if (order.paymentStatus === PaymentStatus.PAID) {
      initialStatus = InvoiceStatus.PAID;
    } else if (order.paymentStatus === PaymentStatus.PENDING) {
      initialStatus = InvoiceStatus.SENT;
    }

    // Create invoice
    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      orderId: orderId,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerAddress: order.shippingAddress,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount || 0,
      discountAmount: order.discountAmount || 0,
      total: order.total,
      status: initialStatus,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      notes: `Invoice created from order ${order.orderNumber}`,
      organizationId: organization.id,
      ...(initialStatus === InvoiceStatus.PAID && { paidDate: new Date().toISOString().split('T')[0] }),
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);
    this.logger.debug(`Saved invoice: ${savedInvoice.invoiceNumber}`);

    // Create invoice items from order items
    for (const item of order.items) {
      this.logger.debug(`Creating invoice item: ${item.productName}`);
      const invoiceItem = this.invoiceItemRepository.create({
        invoiceId: savedInvoice.id,
        productId: item.productId,
        description: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: item.discountAmount || 0,
        total: item.total,
      });

      await this.invoiceItemRepository.save(invoiceItem);
    }

    this.logger.log(
      `Invoice creation completed: ${savedInvoice.invoiceNumber} with status ${initialStatus} (from order ${order.orderNumber} with payment status ${order.paymentStatus})`,
    );
    return this.findOne(savedInvoice.id, organization);
  }

  /**
   * Sync invoice status with the corresponding order's payment status
   */
  private async syncStatusWithOrder(invoice: Invoice, newStatus: InvoiceStatus, organization: Organization): Promise<void> {
    try {
      // Only sync if the invoice is linked to an order
      if (!invoice.orderId) {
        this.logger.debug(`Invoice ${invoice.invoiceNumber} is not linked to an order, skipping status sync`);
        return;
      }

      // Find the corresponding order
      const order = await this.orderRepository.findOne({
        where: { id: invoice.orderId, organizationId: organization.id }
      });

      if (!order) {
        this.logger.debug(`Order not found for invoice ${invoice.invoiceNumber}, skipping status sync`);
        return;
      }

      // Map invoice status to order payment status
      let paymentStatus: PaymentStatus;
      switch (newStatus) {
        case InvoiceStatus.PAID:
          paymentStatus = PaymentStatus.PAID;
          break;
        case InvoiceStatus.SENT:
        case InvoiceStatus.VIEWED:
          paymentStatus = PaymentStatus.PENDING;
          break;
        case InvoiceStatus.CANCELLED:
          paymentStatus = PaymentStatus.FAILED;
          break;
        case InvoiceStatus.DRAFT:
          // Don't change payment status for draft invoices
          return;
        default:
          return;
      }

      // Only update if the status is actually different
      if (order.paymentStatus !== paymentStatus) {
        // Update the order's payment status directly to avoid circular calls
        await this.orderRepository.update(order.id, { 
          paymentStatus: paymentStatus 
        });

        this.logger.log(
          `Synced invoice status: Invoice ${invoice.invoiceNumber} (${newStatus}) -> Order ${order.orderNumber} (${paymentStatus})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync invoice status with order: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw error - invoice status sync failure shouldn't affect invoice update
    }
  }
}

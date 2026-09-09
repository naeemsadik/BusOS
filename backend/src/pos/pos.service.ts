import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order, OrderItem, Product, Customer, OrderStatus, PaymentStatus, PaymentMethod } from '../entities';
import { Organization } from '../entities/organization.entity';
import { CreateSaleDto, PosStatsDto } from './dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async createSale(createSaleDto: CreateSaleDto, organization: Organization): Promise<Order> {
    const orderNumber = await this.generateUniqueOrderNumber(organization.id);

    // Validate products and stock
    for (const item of createSaleDto.items) {
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

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}. Available: ${product.stock}, Required: ${item.quantity}`
        );
      }
    }

    // Determine payment status based on paid amount
    let paymentStatus = PaymentStatus.PENDING;
    const paidAmount = createSaleDto.paidAmount || 0;
    
    // Handle COD payment method
    if (createSaleDto.paymentMethod === PaymentMethod.COD) {
      paymentStatus = PaymentStatus.COD;
    } else if (paidAmount >= createSaleDto.total) {
      paymentStatus = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = PaymentStatus.PARTIAL;
    }

    // Create order
    const order = this.orderRepository.create({
      orderNumber,
      customerId: createSaleDto.customerId,
      customerName: createSaleDto.customerName,
      customerEmail: createSaleDto.customerEmail,
      customerPhone: createSaleDto.customerPhone,
      subtotal: createSaleDto.subtotal,
      taxAmount: createSaleDto.taxAmount || 0,
      discountAmount: createSaleDto.discountAmount || 0,
      shippingAmount: createSaleDto.shippingAmount || 0,
      total: createSaleDto.total,
      paidAmount: paidAmount,
      status: OrderStatus.CONFIRMED,
      paymentStatus: paymentStatus,
      paymentMethod: createSaleDto.paymentMethod,
      notes: createSaleDto.notes,
      paperflyOrderNumber: createSaleDto.paperflyOrderNumber,
      trackingNumber: createSaleDto.paperflyOrderNumber, // Use Paperfly order number as tracking number for Paperfly orders
      courierService: createSaleDto.paperflyOrderNumber ? 'paperfly' : undefined,
      organizationId: organization.id,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items and update stock
    for (const item of createSaleDto.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      // Debug logging for unitCost issues
      const receivedUnitCost = item.unitCost;
      const productCost = product?.cost;
      // Use product cost if unitCost is 0, null, undefined, or invalid
      const finalUnitCost = (receivedUnitCost && receivedUnitCost > 0) ? receivedUnitCost : (productCost || 0);

      const orderItem = this.orderItemRepository.create({
        order: { id: savedOrder.id },
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku || undefined,
        unitPrice: item.unitPrice,
        unitCost: finalUnitCost,
        quantity: item.quantity,
        discountAmount: item.discountAmount || 0,
        total: item.total,
      });

      await this.orderItemRepository.save(orderItem);

      // Update product stock
      await this.productRepository.decrement(
        { id: item.productId },
        'stock',
        item.quantity
      );
    }

    // Update customer stats if customer exists
    if (createSaleDto.customerId) {
      await this.updateCustomerStats(createSaleDto.customerId, createSaleDto.total);
    }

    const result = await this.orderRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['items', 'customer'],
    });

    if (!result) {
      throw new InternalServerErrorException('Failed to retrieve created order');
    }

    return result;
  }

  async getRecentSales(organization: Organization, limit: number = 10): Promise<Order[]> {
    return this.orderRepository.find({
      where: { organizationId: organization.id },
      relations: ['items', 'customer'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getSalesStats(organization: Organization, statsDto: PosStatsDto): Promise<any> {
    const { period = 'today' } = statsDto;
    
    // Get date range from period
    const { startDate, endDate } = this.getDateRangeFromPeriod(period);

    const sales = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: PaymentStatus.PAID })
      .getMany();

    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const totalOrders = sales.length;
    
    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Get top selling products
    const topProducts = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.order', 'order')
      .where('order.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .groupBy('item.productId, item.productName')
      .select([
        'item.productId as productId',
        'item.productName as productName',
        'SUM(item.quantity) as totalQuantity',
        'SUM(item.total) as totalRevenue',
      ])
      .orderBy('totalQuantity', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      period,
      totalSales,
      totalOrders,
      averageOrderValue,
      topProducts,
      salesData: sales.map(sale => ({
        date: sale.createdAt,
        amount: sale.total,
      })),
    };
  }

  async getTopProducts(organization: Organization, params: PosStatsDto): Promise<any[]> {
    try {
      // Get period date range
      const { startDate, endDate } = this.getDateRangeFromPeriod(params.period);
      
      // Get orders within date range
      const query = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .where('order.organizationId = :orgId', { orgId: organization.id })
        .andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
  
      const orders = await query.getMany();
  
      // Create a map to aggregate sales by product
      const productMap = new Map();
  
      orders.forEach(order => {
        try {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              try {
                const productId = item.product?.id || item.productId;
                const productName = item.product?.name || item.productName;
                
                if (productId) {
                  if (!productMap.has(productId)) {
                    productMap.set(productId, {
                      id: productId,
                      name: productName || 'Unknown Product',
                      sold: 0,
                      revenue: 0,
                    });
                  }
                  
                  const productStats = productMap.get(productId);
                  productStats.sold += Number(item.quantity || 0);
                  productStats.revenue += Number(item.total || 0);
                }
              } catch (itemError) {
                console.error('Error processing order item:', itemError);
              }
            });
          }
        } catch (orderError) {
          console.error('Error processing order items:', orderError);
        }
      });

    // Convert map to array and sort by revenue
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Get top 10 products

    return topProducts;
    } catch (error) {
      console.error('Error in getTopProducts:', error);
      return [];
    }
  }

  private async updateCustomerStats(customerId: string, orderTotal: number): Promise<void> {
    await this.customerRepository.increment(
      { id: customerId },
      'totalOrders',
      1
    );
    
    await this.customerRepository.increment(
      { id: customerId },
      'totalSpent',
      orderTotal
    );

    await this.customerRepository.update(
      { id: customerId },
      { lastOrderDate: new Date() }
    );
  }

  private getDateRangeFromPeriod(period?: string, customStartDate?: string, customEndDate?: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    // Handle custom date range
    if (customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate)
      };
    }

    switch (period) {
      case 'today':
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 'this-week':
        startDate.setDate(startDate.getDate() - startDate.getDay());
        break;
      case 'last-24-hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last-7-days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last-30-days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last-90-days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'last-365-days':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'this-month':
        startDate.setDate(1);
        break;
      case 'last-month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        endDate.setDate(0); // Last day of previous month
        break;
      default:
        // Default to last 30 days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return { startDate, endDate };
  }

  async getSalesByPeriod(organization: Organization, periodType: string): Promise<any[]> {
    try {
      const { startDate, endDate } = this.getDateRangeFromPeriod(periodType);
      
      // Define the periods based on the periodType
      let periods: Array<any> = [];
      let groupByFormat: string;
      let periodFormat: string;
      
      if (periodType === 'this-month') {
        // For monthly view, group by days
        groupByFormat = 'YYYY-MM-DD';
        periodFormat = 'D'; // Day of month
        
        // Create array of all days in the month
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          periods.push({
            period: new Date(currentDate).getDate().toString(), // Day of month
            date: new Date(currentDate),
            formattedDate: currentDate.toISOString().split('T')[0]
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
    } else if (periodType === 'this-week') {
      // For weekly view, group by days of week
      groupByFormat = 'YYYY-MM-DD';
      periodFormat = 'ddd'; // Mon, Tue, etc.
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        periods.push({
          period: days[new Date(currentDate).getDay()], // Day of week
          date: new Date(currentDate),
          formattedDate: currentDate.toISOString().split('T')[0]
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Default monthly view with weeks
      groupByFormat = 'YYYY-WW';
      periodFormat = 'Week ';
      
      // Create array of weeks
      const weeksInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      for (let i = 0; i < weeksInPeriod; i++) {
        periods.push({
          period: `Week ${i + 1}`,
          weekNumber: i + 1
        });
      }
    }
    
    // Get all orders in the date range
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: PaymentStatus.PAID })
      .getMany();
    
    // Aggregate sales and orders by period
    interface SalesPeriodData {
      period: string;
      sales: number;
      orders: number;
      change: string;
    }
    
    const salesByPeriod: SalesPeriodData[] = [];
    
    if (periodType === 'this-month' || periodType === 'this-week') {
      // Initialize sales data for each day
      const salesMap = new Map();
      
      periods.forEach(p => {
        salesMap.set(p.formattedDate, {
          period: p.period,
          sales: 0,
          orders: 0,
          change: '0%'
        });
      });
      
      // Aggregate sales by day
      orders.forEach(order => {
        try {
          if (order.createdAt) {
            const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
            if (salesMap.has(orderDate)) {
              const data = salesMap.get(orderDate);
              data.sales += Number(order.total || 0);
              data.orders += 1;
              salesMap.set(orderDate, data);
            }
          }
        } catch (err) {
          console.error('Error processing order:', err, order);
        }
      });
      
      // Convert map to array
      let previousSales = 0;
      periods.forEach(p => {
        const data = salesMap.get(p.formattedDate);
        
        // Calculate change percentage
        if (previousSales > 0) {
          const changePercent = ((data.sales - previousSales) / previousSales) * 100;
          data.change = `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
        }
        previousSales = data.sales;
        
        salesByPeriod.push(data);
      });
    } else {
      // Group by weeks
      const salesByWeek = new Map();
      
      periods.forEach(p => {
        salesByWeek.set(p.period, {
          period: p.period,
          sales: 0,
          orders: 0,
          change: '0%'
        });
      });
      
      // Assign each order to a week
      orders.forEach(order => {
        try {
          if (order.createdAt) {
            const orderDate = new Date(order.createdAt);
            const weeksSinceStart = Math.floor(
              (orderDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
            );
            const weekNumber = Math.max(1, weeksSinceStart + 1); // Ensure week is at least 1
            const weekKey = `Week ${weekNumber}`;
            
            if (salesByWeek.has(weekKey)) {
              const data = salesByWeek.get(weekKey);
              data.sales += Number(order.total || 0);
              data.orders += 1;
              salesByWeek.set(weekKey, data);
            }
          }
        } catch (err) {
          console.error('Error processing order for weekly aggregation:', err, order);
        }
      });
      
      // Calculate change percentages and convert to array
      let previousWeekSales = 0;
      periods.forEach(p => {
        const data = salesByWeek.get(p.period);
        
        if (previousWeekSales > 0) {
          const changePercent = ((data.sales - previousWeekSales) / previousWeekSales) * 100;
          data.change = `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
        }
        previousWeekSales = data.sales;
        
        salesByPeriod.push(data);
      });
    }
    
    return salesByPeriod;
    } catch (error) {
      console.error('Error in getSalesByPeriod:', error);
      // Return empty array as fallback
      return [];
    }
  }

  async getTotalProfit(organization: Organization, statsDto: PosStatsDto): Promise<number> {
    const { period = 'today' } = statsDto;
    
    // Get date range from period
    const { startDate, endDate } = this.getDateRangeFromPeriod(period);

    // Get all order items for the period with their cost information (all payment statuses)
    const orderItems = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.order', 'order')
      .where('order.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .getMany();

    // Calculate profit using the formula: profit = (Selling Price - Discount - Cost Price) × Quantity
    const totalProfit = orderItems.reduce((profit, item) => {
      const sellingPrice = Number(item.unitPrice) || 0;  // Selling Price per unit
      const totalDiscount = Number(item.discountAmount) || 0;  // Total discount for this item
      const discountPerUnit = totalDiscount / (Number(item.quantity) || 1);  // Discount per unit
      const costPrice = Number(item.unitCost) || 0;  // Cost Price (inventory input price)
      const quantity = Number(item.quantity) || 0;
      
      // Apply the profit formula: profit = (Selling Price - Discount - Cost Price) × Quantity
      const itemProfit = (sellingPrice - discountPerUnit - costPrice) * quantity;
      return profit + itemProfit;
    }, 0);

    return totalProfit;
  }

  async getTotalProfitByPaymentStatus(organization: Organization, statsDto: PosStatsDto, paymentStatus: string): Promise<number> {
    const { period = 'today' } = statsDto;
    
    // Get date range from period
    const { startDate, endDate } = this.getDateRangeFromPeriod(period);

    // Get order items filtered by payment status
    const orderItems = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.order', 'order')
      .where('order.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .andWhere('order.paymentStatus = :paymentStatus', { paymentStatus })
      .getMany();

    // Calculate profit using the formula: profit = (Selling Price - Discount - Cost Price) × Quantity
    const totalProfit = orderItems.reduce((profit, item) => {
      const sellingPrice = Number(item.unitPrice) || 0;  // Selling Price per unit
      const totalDiscount = Number(item.discountAmount) || 0;  // Total discount for this item
      const discountPerUnit = totalDiscount / (Number(item.quantity) || 1);  // Discount per unit
      const costPrice = Number(item.unitCost) || 0;  // Cost Price (inventory input price)
      const quantity = Number(item.quantity) || 0;
      
      // Apply the profit formula: profit = (Selling Price - Discount - Cost Price) × Quantity
      const itemProfit = (sellingPrice - discountPerUnit - costPrice) * quantity;
      return profit + itemProfit;
    }, 0);

    return totalProfit;
  }

  async getProfitByProduct(organization: Organization, statsDto: PosStatsDto): Promise<any[]> {
    const { period = 'today' } = statsDto;
    
    // Get date range from period
    const { startDate, endDate } = this.getDateRangeFromPeriod(period);

    // Get all order items for the period with their cost information (all payment statuses)
    const orderItems = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.order', 'order')
      .where('order.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .andWhere('order.createdAt <= :endDate', { endDate })
      .getMany();

    // Create a map to aggregate profit by product
    const productProfitMap = new Map();

    orderItems.forEach(item => {
      const productId = item.productId;
      const productName = item.productName;
      
      if (productId) {
        if (!productProfitMap.has(productId)) {
          productProfitMap.set(productId, {
            productId,
            productName,
            totalRevenue: 0,
            totalCost: 0,
            totalDiscount: 0,
            totalProfit: 0,
            quantitySold: 0,
            averageSellingPrice: 0,
            averageCost: 0,
            profitMargin: 0
          });
        }
        
        const productData = productProfitMap.get(productId);
        const sellingPrice = Number(item.unitPrice) || 0;
        const totalDiscount = Number(item.discountAmount) || 0;
        const discountPerUnit = totalDiscount / (Number(item.quantity) || 1);
        const costPrice = Number(item.unitCost) || 0;
        const quantity = Number(item.quantity) || 0;
        
        // Calculate profit for this item
        const itemProfit = (sellingPrice - discountPerUnit - costPrice) * quantity;
        const itemRevenue = sellingPrice * quantity;
        const itemCost = costPrice * quantity;
        
        // Update product data
        productData.totalRevenue += itemRevenue;
        productData.totalCost += itemCost;
        productData.totalDiscount += totalDiscount;
        productData.totalProfit += itemProfit;
        productData.quantitySold += quantity;
        productData.averageSellingPrice = productData.totalRevenue / productData.quantitySold;
        productData.averageCost = productData.totalCost / productData.quantitySold;
        
        // Calculate profit margin percentage
        if (productData.totalRevenue > 0) {
          productData.profitMargin = (productData.totalProfit / productData.totalRevenue) * 100;
        }
      }
    });

    // Convert map to array and sort by profit
    return Array.from(productProfitMap.values())
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }

  async getProfitStats(organization: Organization, statsDto: PosStatsDto): Promise<any> {
    const { period = 'today' } = statsDto;
    
    // Get profit data for all payment statuses
    const totalProfit = await this.getTotalProfit(organization, statsDto);
    const profitByProduct = await this.getProfitByProduct(organization, statsDto);
    
    // Get profit data specifically for paid orders
    const paidProfit = await this.getTotalProfitByPaymentStatus(organization, statsDto, 'paid');
    
    // Calculate additional metrics
    const totalRevenue = profitByProduct.reduce((sum, product) => sum + product.totalRevenue, 0);
    const totalCost = profitByProduct.reduce((sum, product) => sum + product.totalCost, 0);
    const totalDiscount = profitByProduct.reduce((sum, product) => sum + product.totalDiscount, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const paidProfitMargin = totalRevenue > 0 ? (paidProfit / totalRevenue) * 100 : 0;
    
    return {
      period,
      totalProfit,
      paidProfit,
      totalRevenue,
      totalCost,
      totalDiscount,
      profitMargin,
      paidProfitMargin,
      topProfitableProducts: profitByProduct.slice(0, 10),
      summary: {
        averageProfitPerSale: profitByProduct.length > 0 ? totalProfit / profitByProduct.length : 0,
        averagePaidProfitPerSale: profitByProduct.length > 0 ? paidProfit / profitByProduct.length : 0,
        highestProfitProduct: profitByProduct[0] || null,
        lowestProfitProduct: profitByProduct[profitByProduct.length - 1] || null
      }
    };
  }

  async checkCostIssues(organization: Organization): Promise<number> {
    // Find order items where unitCost is 0 but the product has a non-zero cost
    const result = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .where('o.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('oi.unitCost = :unitCost', { unitCost: 0 })
      .andWhere('p.cost > :cost', { cost: 0 })
      .getCount();

    return result;
  }

  async fixCostIssues(organization: Organization): Promise<{
    itemsFixed: number;
    totalRevenue: number;
    totalCost: number;
  }> {
    // Get items that need fixing with proper joins and relations
    const itemsToFix = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.product', 'p')
      .where('o.organizationId = :organizationId', { organizationId: organization.id })
      .andWhere('oi.unitCost = :unitCost', { unitCost: 0 })
      .andWhere('p.cost > :cost', { cost: 0 })
      .getMany();

    let itemsFixed = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    // For each item that needs fixing, get the product cost and update
    for (const item of itemsToFix) {
      // Load the product to get its cost
      const product = await this.productRepository.findOne({
        where: { id: item.productId }
      });

      if (product && product.cost > 0) {
        await this.orderItemRepository.update(
          { id: item.id },
          { unitCost: product.cost }
        );

        itemsFixed++;
        totalRevenue += Number(item.unitPrice) * Number(item.quantity);
        totalCost += Number(product.cost) * Number(item.quantity);
      }
    }

    return {
      itemsFixed,
      totalRevenue,
      totalCost
    };
  }

  private async generateUniqueOrderNumber(organizationId: string): Promise<string> {
    // Use a simpler approach: organization prefix + timestamp + sequential number
    const orgPrefix = organizationId.slice(-4).toUpperCase();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of orders created today for this organization
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
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
      const uniqueSuffix = now.getTime().toString().slice(-6);
      return `ORD-${orgPrefix}-${dateStr}-${uniqueSuffix}`;
    }
    
    return orderNumber;
  }
}

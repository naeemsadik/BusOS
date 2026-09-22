import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, ILike, Between, FindOptionsWhere } from 'typeorm';
import { Delivery, Order, Organization, DeliveryStatus, OrderStatus } from '../entities';
import { CreateDeliveryDto, UpdateDeliveryDto, DeliveryQueryDto, CourierWebhookDto } from './dto';
import { CourierService, CourierProvider, CourierOrder } from './courier.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  private buildLikeSearchPattern(value: string): string {
    return ['%', this.escapeLikePattern(value), '%'].join('');
  }

  private formatCourierServiceName(provider: string): string {
    const normalizedProvider = provider.trim();
    if (!normalizedProvider) {
      return normalizedProvider;
    }

    return [normalizedProvider.charAt(0).toUpperCase(), normalizedProvider.slice(1)].join('');
  }

  async trackPathaoDelivery(consignment_id: string, phone_no: string, organization: any): Promise<any> {
    const url = 'https://merchant.pathao.com/api/v1/user/tracking';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consignment_id, phone_no })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const rawResponse = await response.json();

      if (rawResponse.data && rawResponse.data.order) {
        const order = rawResponse.data.order;
        const state = rawResponse.data.state;

        const statusMapping: Record<string, string> = {
          'Pick-Up Cancel': 'Pickup Cancelled',
          'Delivered': 'Delivered',
          'In Transit': 'In Transit',
          'Picked-Up': 'Picked Up',
          'Assigned': 'Assigned to Courier',
          'Pending': 'Pending',
          'Returned': 'Returned',
          'Failed': 'Delivery Failed',
          'Cancelled': 'Cancelled'
        };

        const displayStatus = statusMapping[order.transfer_status] ||
                            statusMapping[state?.name] ||
                            order.transfer_status ||
                            state?.name ||
                            'Unknown';

        rawResponse.data.display_status = displayStatus;
        rawResponse.data.current_status = order.transfer_status || state?.name || 'Unknown';
      }

      return rawResponse;
    } catch (error) {
      throw new BadRequestException(`Failed to track Pathao delivery: ${error.message}`);
    }
  }
  constructor(
    @InjectRepository(Delivery)
    private deliveryRepository: Repository<Delivery>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private courierService: CourierService,
  ) { }

  private generateDeliveryNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `DEL-${timestamp}-${random}`.toUpperCase();
  }

  async create(createDeliveryDto: CreateDeliveryDto, organization: Organization): Promise<Delivery> {
    const order = await this.orderRepository.findOne({
      where: {
        id: createDeliveryDto.orderId,
        organizationId: organization.id,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const existingDelivery = await this.deliveryRepository.findOne({
      where: { orderId: createDeliveryDto.orderId },
    });

    if (existingDelivery) {
      throw new BadRequestException('Delivery already exists for this order');
    }

    const deliveryNumber = this.generateDeliveryNumber();

    const delivery = this.deliveryRepository.create({
      ...createDeliveryDto,
      deliveryNumber,
      trackingNumber: deliveryNumber,
      organizationId: organization.id,
    });

    return await this.deliveryRepository.save(delivery);
  }

  async findAll(query: DeliveryQueryDto, organization: Organization): Promise<{
    deliveries: Delivery[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      status,
      deliveryType,
      driverName,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.deliveryRepository.createQueryBuilder('delivery');
    queryBuilder.leftJoinAndSelect('delivery.order', 'order');
    queryBuilder.where('delivery.organizationId = :organizationId', { organizationId: organization.id });

    if (status) {
      queryBuilder.andWhere('delivery.status = :status', { status });
    }

    if (deliveryType) {
      queryBuilder.andWhere('delivery.deliveryType = :deliveryType', { deliveryType });
    }

    if (driverName) {
      queryBuilder.andWhere('delivery.driverName ILIKE :driverName', {
        driverName: this.buildLikeSearchPattern(driverName)
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('delivery.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(delivery.deliveryNumber ILIKE :search OR delivery.customerName ILIKE :search OR delivery.trackingNumber ILIKE :search)',
        { search: this.buildLikeSearchPattern(search) }
      );
    }

    queryBuilder.orderBy('delivery.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);

    const [deliveries, total] = await queryBuilder.getManyAndCount();

    return {
      deliveries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, organization: Organization): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id, organizationId: organization.id },
      relations: ['order'],
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    return delivery;
  }

  async findByOrderId(orderId: string, organization: Organization): Promise<Delivery | null> {
    const delivery = await this.deliveryRepository.findOne({
      where: { orderId, organizationId: organization.id },
      relations: ['order'],
    });

    return delivery;
  }

  async update(id: string, updateDeliveryDto: UpdateDeliveryDto, organization: Organization): Promise<Delivery> {
    const delivery = await this.findOne(id, organization);

    if (updateDeliveryDto.status === DeliveryStatus.DELIVERED && !updateDeliveryDto.actualDeliveryDate) {
      updateDeliveryDto.actualDeliveryDate = new Date().toISOString();
    }

    await this.deliveryRepository.update(id, updateDeliveryDto);

    if (updateDeliveryDto.status === DeliveryStatus.DELIVERED && delivery.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: delivery.orderId, organizationId: organization.id },
      });

      if (order) {
        await this.orderRepository.update(order.id, {
          status: OrderStatus.DELIVERED,
        });
        this.logger.log(`Order ${order.orderNumber} marked as DELIVERED from delivery update`);
      }
    }

    return this.findOne(id, organization);
  }

  async remove(id: string, organization: Organization): Promise<void> {
    const delivery = await this.findOne(id, organization);

    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException('Only pending deliveries can be deleted');
    }

    await this.deliveryRepository.remove(delivery);
  }

  async getDeliveryStats(organization: Organization): Promise<any> {
    const deliveries = await this.deliveryRepository.find({
      where: { organizationId: organization.id },
    });

    const stats = {
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === DeliveryStatus.PENDING).length,
      assigned: deliveries.filter(d => d.status === DeliveryStatus.ASSIGNED).length,
      pickedUp: deliveries.filter(d => d.status === DeliveryStatus.PICKED_UP).length,
      inTransit: deliveries.filter(d => d.status === DeliveryStatus.IN_TRANSIT).length,
      delivered: deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length,
      failed: deliveries.filter(d => d.status === DeliveryStatus.FAILED).length,
      returned: deliveries.filter(d => d.status === DeliveryStatus.RETURNED).length,
      totalFees: deliveries.reduce((sum, delivery) => sum + Number(delivery.deliveryFee), 0),
    };

    return stats;
  }

  async trackDelivery(trackingNumber: string, organization: Organization): Promise<Delivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: {
        trackingNumber,
        organizationId: organization.id,
      },
      relations: ['order'],
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found with this tracking number');
    }

    return delivery;
  }

  async getDeliveriesByDriver(driverName: string, organization: Organization): Promise<Delivery[]> {
    return this.deliveryRepository.find({
      where: {
        driverName,
        organizationId: organization.id,
      },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }

  async createCourierDelivery(
    createDeliveryDto: CreateDeliveryDto & {
      courierProvider?: CourierProvider;
      courierOptions?: any;
    },
    organization: Organization
  ): Promise<Delivery> {
    if (createDeliveryDto.courierProvider === 'pathao') {
      const opts = createDeliveryDto.courierOptions;
      const missing: string[] = [];
      if (!opts) {
        throw new BadRequestException('Missing courierOptions for Pathao delivery');
      }
      if (!opts.store_id) missing.push('store_id');
      if (!opts.recipient_city) missing.push('recipient_city');
      if (!opts.recipient_zone) missing.push('recipient_zone');
      if (missing.length > 0) {
        throw new BadRequestException(`Missing required Pathao courierOptions: ${missing.join(', ')}`);
      }
    }

    const delivery = await this.create(createDeliveryDto, organization);

    if (createDeliveryDto.courierProvider && this.courierService.isProviderConfigured(createDeliveryDto.courierProvider, organization)) {
      try {
        const courierOrder: CourierOrder = {
          provider: createDeliveryDto.courierProvider,
          invoice: delivery.deliveryNumber,
          recipient_name: delivery.customerName,
          recipient_phone: delivery.customerPhone,
          alternative_phone: createDeliveryDto.alternativePhone,
          recipient_address: delivery.deliveryAddress,
          cod_amount: createDeliveryDto.codAmount || 0,
          note: delivery.notes || delivery.deliveryInstructions || '',
          item_description: createDeliveryDto.itemDescription || 'General Item',
          total_lot: createDeliveryDto.totalLot,
          delivery_type: createDeliveryDto.steadfastDeliveryType ?? (delivery.deliveryType === 'pickup' ? 1 : 0),
        };

        if (createDeliveryDto.courierProvider === 'pathao' && createDeliveryDto.courierOptions) {
          const opts = createDeliveryDto.courierOptions;
          courierOrder.store_id = opts.store_id ? Number(opts.store_id) : undefined;
          courierOrder.recipient_city = opts.recipient_city ? Number(opts.recipient_city) : undefined;
          courierOrder.recipient_zone = opts.recipient_zone ? Number(opts.recipient_zone) : undefined;
          courierOrder.recipient_area = opts.recipient_area ? Number(opts.recipient_area) : undefined;
          const totalLot = createDeliveryDto.totalLot || courierOrder.total_lot || 1;
          courierOrder.item_type = opts.item_type ? Number(opts.item_type) as 1 | 2 : (totalLot === 1 ? 1 : 2);
          courierOrder.item_weight = opts.item_weight ? Number(opts.item_weight) : Math.max(1, Math.ceil(Number(totalLot || 1)));

          try {
            const deliveryStreetAddress = delivery.customerName || '';
            const addressParts = [deliveryStreetAddress.trim()];

            if (opts.recipient_city) {
              const cities = await this.courierService.getPathaoCities(organization);
              const city = cities.find((c: any) => String(c.city_id) === String(opts.recipient_city));

              if (opts.recipient_zone) {
                const zones = await this.courierService.getPathaoZones(organization, opts.recipient_city);
                const zone = zones.find((z: any) => String(z.zone_id) === String(opts.recipient_zone));

                if (opts.recipient_area) {
                  const areas = await this.courierService.getPathaoAreas(organization, opts.recipient_zone);
                  const area = areas.find((a: any) => String(a.area_id) === String(opts.recipient_area));
                  if (area) addressParts.push(area.area_name);
                }

                if (zone) addressParts.push(zone.zone_name);
              }

              if (city) addressParts.push(city.city_name);
            }

            const fullAddress = addressParts.filter(p => p).join(', ');
            const order = delivery.orderId ? await this.orderRepository.findOne({ where: { id: delivery.orderId } }) : null;
            const orderStreetAddress = order?.shippingAddress;
            courierOrder.recipient_address = [orderStreetAddress, fullAddress].filter(p => p).join(', ');

            this.logger.debug(`Constructed Pathao address: ${courierOrder.recipient_address}`);
          } catch (addressErr) {
            this.logger.warn(
              `Failed to construct Pathao address: ${
                addressErr instanceof Error ? addressErr.message : String(addressErr)
              }`,
            );
          }
        }

        try {
          this.logger.debug(`Creating courier order payload: ${JSON.stringify(courierOrder)}`);
          this.logger.debug(`Original courierOptions: ${JSON.stringify(createDeliveryDto.courierOptions)}`);
        } catch (logErr) {
          this.logger.warn(
            `Failed to stringify courier payload for logging: ${
              logErr instanceof Error ? logErr.message : String(logErr)
            }`,
          );
        }

        const courierResponse = await this.courierService.createOrder(courierOrder, organization);

        if (courierResponse.success) {
          const courierServiceName = this.formatCourierServiceName(createDeliveryDto.courierProvider);

          await this.deliveryRepository.update(delivery.id, {
            courierProvider: createDeliveryDto.courierProvider,
            courierConsignmentId: courierResponse.consignment_id?.toString(),
            courierTrackingCode: courierResponse.tracking_code,
            courierInvoice: courierResponse.invoice,
            courierStatus: 'pending',
            trackingNumber: courierResponse.tracking_code || courierResponse.consignment_id?.toString(),
            courierService: courierServiceName,
          });

          if (delivery.orderId) {
            const trackingNumber = courierResponse.tracking_code || courierResponse.consignment_id?.toString();

            await this.orderRepository.update(delivery.orderId, {
              trackingNumber: trackingNumber,
              courierService: courierServiceName,
              status: OrderStatus.SHIPPED
            });
          }


          return await this.findOne(delivery.id, organization);
        } else {
          throw new Error(courierResponse.error || 'Failed to create courier delivery');
        }
      } catch (error) {
        this.logger.error(
          `Failed to create ${createDeliveryDto.courierProvider} delivery: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        await this.deliveryRepository.update(delivery.id, {
          notes: `${delivery.notes || ''}\n\nCourier Integration Error: ${error.message}`.trim(),
        });
      }
    }

    return delivery;
  }

  async getAvailableCourierProviders(organization: Organization): Promise<CourierProvider[]> {
    return this.courierService.getAvailableProviders(organization);
  }

  async getCourierBalance(provider: CourierProvider, organization: Organization): Promise<number | null> {
    try {
      const balanceResponse = await this.courierService.getBalance(provider, organization);
      return balanceResponse.balance;
    } catch (error) {
      throw new BadRequestException(`Failed to get ${provider} balance: ${error.message}`);
    }
  }

  async bulkSyncCourierStatus(organization: Organization, provider?: CourierProvider): Promise<{ updated: number; failed: number }> {
    const whereClause: any = {
      organizationId: organization.id,
      courierConsignmentId: Not(IsNull()),
    };

    if (provider) {
      whereClause.courierProvider = provider;
    }

    const deliveries = await this.deliveryRepository.find({
      where: whereClause,
    });

    const updatedDeliveryIds: string[] = [];
    const failedDeliveryIds: string[] = [];

    for (const delivery of deliveries) {
      try {
        const courierProvider = (delivery.courierProvider as CourierProvider) || 'steadfast';
        const consignmentId = delivery.courierConsignmentId || delivery.steadfastConsignmentId;

        if (!consignmentId) {
          failedDeliveryIds.push(delivery.id);
          continue;
        }

        const courierResponse = await this.courierService.getOrderStatus(
          courierProvider,
          { consignment_id: consignmentId },
          organization,
        );

        const newStatus = this.courierService.mapCourierStatusToDeliveryStatus(
          courierResponse.delivery_status,
          courierProvider,
        );

        if (delivery.status !== newStatus) {
          delivery.status = newStatus;
          delivery.courierStatus = courierResponse.delivery_status;

          if (courierProvider === 'steadfast') {
            delivery.steadfastStatus = courierResponse.delivery_status;
          }

          await this.deliveryRepository.save(delivery);
          updatedDeliveryIds.push(delivery.id);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync delivery ${delivery.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        failedDeliveryIds.push(delivery.id);
      }
    }

    return {
      updated: updatedDeliveryIds.length,
      failed: failedDeliveryIds.length,
    };
  }

  async trackCourierDelivery(trackingCode: string, provider: CourierProvider, organization: Organization): Promise<any> {
    try {
      const trackingResponse = await this.courierService.getOrderStatus(
        provider,
        { tracking_code: trackingCode },
        organization,
      );

      return {
        provider,
        trackingCode,
        status: trackingResponse.delivery_status,
        mappedStatus: this.courierService.mapCourierStatusToDeliveryStatus(
          trackingResponse.delivery_status,
          provider
        ),
        data: trackingResponse.data,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to track ${provider} delivery: ${error.message}`);
    }
  }

  async trackPaperflyDelivery(orderNumber: string): Promise<any> {
    try {
      const trackingResponse = await this.courierService.getOrderStatus(
        'paperfly',
        { order_number: orderNumber },
        {} as Organization,
      );

      return {
        provider: 'paperfly',
        orderNumber,
        status: trackingResponse.delivery_status,
        data: trackingResponse.data,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to track Paperfly delivery: ${error.message}`);
    }
  }

  async getPathaoStores(organization: Organization): Promise<any> {
    return this.courierService.getPathaoStores(organization);
  }

  async getPathaoCities(organization: Organization): Promise<any> {
    return this.courierService.getPathaoCities(organization);
  }

  async getPathaoZones(organization: Organization, cityId: number | string): Promise<any> {
    return this.courierService.getPathaoZones(organization, cityId);
  }

  async getPathaoAreas(organization: Organization, zoneId: number | string): Promise<any> {
    return this.courierService.getPathaoAreas(organization, zoneId);
  }

  async getPathaoPricePlan(organization: Organization, payload: any): Promise<any> {
    return this.courierService.getPathaoPricePlan(organization, payload);
  }

  async handleCourierWebhook(
    webhookData: CourierWebhookDto,
    headers: { authorization?: string; signature?: string },
  ): Promise<any> {
    try {
      const delivery = await this.deliveryRepository.findOne({
        where: {
          courierConsignmentId: webhookData.consignment_id,
          courierProvider: webhookData.provider,
        },
        relations: ['order', 'organization'],
      });

      if (!delivery && webhookData.provider === 'steadfast') {
        const legacyDelivery = await this.deliveryRepository.findOne({
          where: {
            steadfastConsignmentId: webhookData.consignment_id,
          },
          relations: ['order', 'organization'],
        });

        if (legacyDelivery) {
          legacyDelivery.courierProvider = 'steadfast';
          legacyDelivery.courierConsignmentId = webhookData.consignment_id;
          legacyDelivery.courierTrackingCode = webhookData.tracking_code || legacyDelivery.courierTrackingCode;
          await this.deliveryRepository.save(legacyDelivery);

          return this.handleCourierWebhook(webhookData, headers);
        }
      }

      if (!delivery) {
        throw new BadRequestException(`Delivery not found for consignment ID: ${webhookData.consignment_id}`);
      }

      const newStatus = this.courierService.mapCourierStatusToDeliveryStatus(
        webhookData.status,
        webhookData.provider,
      );

      const updateData: Partial<Delivery> = {
        status: newStatus,
        courierStatus: webhookData.status,
      };

      if (webhookData.provider === 'steadfast') {
        updateData.steadfastStatus = webhookData.status;
      }

      if (webhookData.status === 'delivered' && !delivery.actualDeliveryDate) {
        updateData.actualDeliveryDate = new Date();
      }

      if (webhookData.status_message) {
        const noteLines: string[] = [];
        if (delivery.notes) {
          noteLines.push(delivery.notes);
        }
        noteLines.push([webhookData.provider, ' Status: ', webhookData.status_message].join(''));
        updateData.notes = noteLines.join('\n').trim();
      }

      await this.deliveryRepository.update(delivery.id, updateData);

      if (newStatus === DeliveryStatus.DELIVERED && delivery.orderId) {
        const order = await this.orderRepository.findOne({
          where: { id: delivery.orderId },
        });

        if (order) {
          await this.orderRepository.update(order.id, {
            status: OrderStatus.DELIVERED,
          });
        }
      }

      return {
        deliveryId: delivery.id,
        oldStatus: delivery.status,
        newStatus: newStatus,
        courierStatus: webhookData.status,
        consignmentId: webhookData.consignment_id,
      };
    } catch (error) {
      this.logger.error(
        `Courier webhook processing error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}

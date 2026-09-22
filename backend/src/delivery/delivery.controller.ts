import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Logger,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto, UpdateDeliveryDto, DeliveryQueryDto, CourierWebhookDto } from './dto';
import { CourierProvider } from './courier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Delivery')
@Controller('delivery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()

export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}
  @Post('courier/pathao/track')
  @ApiOperation({ summary: 'Track Pathao delivery by consignment_id and phone_no' })
  @ApiResponse({ status: 200, description: 'Pathao tracking retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Failed to track Pathao delivery' })
  async trackPathaoDelivery(@Body() body: { consignment_id: string; phone_no: string }, @Request() req) {
    return this.deliveryService.trackPathaoDelivery(body.consignment_id, body.phone_no, req.user.organization);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new delivery' })
  @ApiResponse({ status: 201, description: 'Delivery created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or delivery already exists' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async create(@Body() createDeliveryDto: CreateDeliveryDto, @Request() req) {
    return this.deliveryService.create(createDeliveryDto, req.user.organization);
  }

  @Get()
  @ApiOperation({ summary: 'Get all deliveries' })
  @ApiResponse({ status: 200, description: 'Deliveries retrieved successfully' })
  async findAll(@Query() query: DeliveryQueryDto, @Request() req) {
    return this.deliveryService.findAll(query, req.user.organization);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get delivery statistics' })
  @ApiResponse({ status: 200, description: 'Delivery statistics retrieved successfully' })
  async getStats(@Request() req) {
    return this.deliveryService.getDeliveryStats(req.user.organization);
  }

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track delivery by tracking number' })
  @ApiResponse({ status: 200, description: 'Delivery tracked successfully' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async trackDelivery(@Param('trackingNumber') trackingNumber: string, @Request() req) {
    return this.deliveryService.trackDelivery(trackingNumber, req.user.organization);
  }

  @Get('driver/:driverName')
  @ApiOperation({ summary: 'Get deliveries by driver' })
  @ApiResponse({ status: 200, description: 'Driver deliveries retrieved successfully' })
  async getDeliveriesByDriver(@Param('driverName') driverName: string, @Request() req) {
    return this.deliveryService.getDeliveriesByDriver(driverName, req.user.organization);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get delivery by order ID' })
  @ApiResponse({ status: 200, description: 'Delivery retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async findByOrderId(@Param('orderId', ParseUUIDPipe) orderId: string, @Request() req) {
    const delivery = await this.deliveryService.findByOrderId(orderId, req.user.organization);
    if (!delivery) {
      throw new NotFoundException('No delivery found for this order');
    }
    return delivery;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery by ID' })
  @ApiResponse({ status: 200, description: 'Delivery retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.deliveryService.findOne(id, req.user.organization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery' })
  @ApiResponse({ status: 200, description: 'Delivery updated successfully' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
    @Request() req,
  ) {
    return this.deliveryService.update(id, updateDeliveryDto, req.user.organization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete delivery' })
  @ApiResponse({ status: 200, description: 'Delivery deleted successfully' })
  @ApiResponse({ status: 404, description: 'Delivery not found' })
  @ApiResponse({ status: 400, description: 'Only pending deliveries can be deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.deliveryService.remove(id, req.user.organization);
    return { message: 'Delivery deleted successfully' };
  }

  // Courier Integration Endpoints
  @Post('courier')
  @ApiOperation({ summary: 'Create delivery with courier service' })
  @ApiResponse({ status: 201, description: 'Courier delivery created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or courier credentials not configured' })
  async createCourierDelivery(
    @Body() createDeliveryDto: CreateDeliveryDto & { courierProvider?: CourierProvider; courierOptions?: any }, 
    @Request() req
  ) {
    return this.deliveryService.createCourierDelivery(createDeliveryDto, req.user.organization);
  }

  @Get('courier/providers')
  @ApiOperation({ summary: 'Get available courier providers' })
  @ApiResponse({ status: 200, description: 'Available courier providers retrieved successfully' })
  async getAvailableCourierProviders(@Request() req) {
    const providers = await this.deliveryService.getAvailableCourierProviders(req.user.organization);
    return { providers };
  }

  @Get('courier/:provider/balance')
  @ApiOperation({ summary: 'Get courier service balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Failed to get courier balance' })
  async getCourierBalance(@Param('provider') provider: CourierProvider, @Request() req) {
    const balance = await this.deliveryService.getCourierBalance(provider, req.user.organization);
    return { provider, balance };
  }

  @Patch('courier/:id/sync')
  @ApiOperation({ summary: 'Sync delivery status with courier service' })
  @ApiResponse({ status: 200, description: 'Delivery status synced successfully' })
  @ApiResponse({ status: 400, description: 'Delivery not linked to courier service' })
  async syncCourierStatus(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    // Use the generic courier sync method instead of Steadfast-specific
    return this.deliveryService.bulkSyncCourierStatus(req.user.organization);
  }

  @Post('courier/bulk-sync')
  @ApiOperation({ summary: 'Bulk sync all courier deliveries' })
  @ApiResponse({ status: 200, description: 'Bulk sync completed' })
  async bulkSyncCourierStatus(@Body() body: { provider?: CourierProvider }, @Request() req) {
    return this.deliveryService.bulkSyncCourierStatus(req.user.organization, body.provider);
  }

  @Get('courier/:provider/track/:trackingCode')
  @ApiOperation({ summary: 'Track courier delivery by tracking code' })
  @ApiResponse({ status: 200, description: 'Delivery tracking retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Failed to track delivery' })
  async trackCourierDelivery(
    @Param('provider') provider: CourierProvider,
    @Param('trackingCode') trackingCode: string, 
    @Request() req
  ) {
    return this.deliveryService.trackCourierDelivery(trackingCode, provider, req.user.organization);
  }

  @Get('paperfly/track/:orderNumber')
  @ApiOperation({ summary: 'Track Paperfly delivery by order number' })
  @ApiResponse({ status: 200, description: 'Paperfly tracking retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Failed to track Paperfly delivery' })
  async trackPaperflyDelivery(
    @Param('orderNumber') orderNumber: string
  ) {
    return this.deliveryService.trackPaperflyDelivery(orderNumber);
  }

  // Pathao helper endpoints
  @Get('courier/pathao/stores')
  @ApiOperation({ summary: 'Get Pathao stores for organization' })
  async getPathaoStores(@Request() req) {
    return this.deliveryService.getPathaoStores(req.user.organization);
  }

  @Get('courier/pathao/cities')
  @ApiOperation({ summary: 'Get Pathao cities list' })
  async getPathaoCities(@Request() req) {
    return this.deliveryService.getPathaoCities(req.user.organization);
  }

  @Get('courier/pathao/zones/:cityId')
  @ApiOperation({ summary: 'Get Pathao zones for a city' })
  async getPathaoZones(@Param('cityId') cityId: string, @Request() req) {
    return this.deliveryService.getPathaoZones(req.user.organization, cityId);
  }

  @Get('courier/pathao/areas/:zoneId')
  @ApiOperation({ summary: 'Get Pathao areas for a zone' })
  async getPathaoAreas(@Param('zoneId') zoneId: string, @Request() req) {
    return this.deliveryService.getPathaoAreas(req.user.organization, zoneId);
  }

  @Post('courier/pathao/price-plan')
  @ApiOperation({ summary: 'Get Pathao price plan for an order' })
  async getPathaoPricePlan(@Body() payload: any, @Request() req) {
    return this.deliveryService.getPathaoPricePlan(req.user.organization, payload);
  }

  // Courier Webhook Endpoints (No Auth Required)
  @Post('webhooks/courier')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleCourierWebhook(
    @Body() webhookData: CourierWebhookDto,
    @Headers('authorization') authorization?: string,
    @Headers('x-courier-signature') signature?: string,
  ) {
    const logger = new Logger('CourierWebhook');
    
    try {
      logger.log(`Received ${webhookData.provider} webhook: ${JSON.stringify(webhookData)}`);
      
      const result = await this.deliveryService.handleCourierWebhook(webhookData, {
        authorization,
        signature,
      });
      
      logger.log(`Webhook processed successfully for consignment: ${webhookData.consignment_id}`);
      
      return {
        success: true,
        message: 'Webhook processed successfully',
        provider: webhookData.provider,
        consignment_id: webhookData.consignment_id,
        ...result,
      };
    } catch (error) {
      logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      
      // Return success even on error to prevent webhook retries for validation errors
      return {
        success: false,
        message: error.message || 'Webhook processing failed',
        provider: webhookData.provider,
        consignment_id: webhookData.consignment_id,
      };
    }
  }
}

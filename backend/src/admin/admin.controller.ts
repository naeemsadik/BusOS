import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Query,
  Param,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { BkashService } from '../payments/bkash.service';
import { SmsService } from '../sms/sms.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import {
  AdminLoginDto,
  CreateAdminDto,
  UpdateAdminDto,
  ChangeAdminPasswordDto,
} from '../auth/dto/admin.dto';
import { Admin } from '../entities/admin.entity';
import { SubscriptionPlan } from '../entities';

// Add DTOs for subscription creation
export class CreateSubscriptionDto {
  organizationId: string;
  plan: SubscriptionPlan;
  startDate?: Date;
  endDate?: Date;
  autoRenew?: boolean;
}

export class UpdateSubscriptionDto {
  plan?: SubscriptionPlan;
  endDate?: Date;
  autoRenew?: boolean;
}

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private adminAnalyticsService: AdminAnalyticsService,
    private bkashService: BkashService,
    private smsService: SmsService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Admin logged in successfully' })
  async login(@Body() loginDto: AdminLoginDto) {
    return this.adminService.login(loginDto);
  }

  @Post('create')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createAdmin(createAdminDto);
  }

  @Get('profile')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin profile' })
  @ApiResponse({ status: 200, description: 'Admin profile retrieved' })
  async getProfile(@CurrentAdmin() admin: Admin) {
    return this.adminService.getProfile(admin.id);
  }

  @Patch('profile')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin profile' })
  @ApiResponse({ status: 200, description: 'Admin profile updated' })
  async updateProfile(
    @CurrentAdmin() admin: Admin,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminService.updateAdmin(admin.id, updateAdminDto);
  }

  @Patch('change-password')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change admin password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @CurrentAdmin() admin: Admin,
    @Body() changePasswordDto: ChangeAdminPasswordDto,
  ) {
    return this.adminService.changePassword(admin.id, changePasswordDto);
  }

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  async getDashboardStats() {
    return this.adminAnalyticsService.getDashboardStats();
  }

  @Get('analytics/subscriptions')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription analytics' })
  @ApiResponse({ status: 200, description: 'Subscription analytics retrieved' })
  async getSubscriptionAnalytics() {
    return this.adminAnalyticsService.getSubscriptionAnalytics();
  }

  @Get('analytics/sms')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SMS analytics' })
  @ApiResponse({ status: 200, description: 'SMS analytics retrieved' })
  async getSmsAnalytics() {
    return this.adminAnalyticsService.getSmsAnalytics();
  }

  @Get('sms/settings')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SMS settings' })
  @ApiResponse({ status: 200, description: 'SMS settings retrieved' })
  async getSmsSettings() {
    return this.smsService.getSmsSettings();
  }

  @Patch('sms/settings')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update SMS settings' })
  @ApiResponse({ status: 200, description: 'SMS settings updated' })
  async updateSmsSettings(@Body() settings: {
    pricePerSms?: number;
    minimumPurchase?: number;
    maximumPurchase?: number;
    lowBalanceThreshold?: number;
    criticalBalanceThreshold?: number;
    isEnabled?: boolean;
    defaultGateway?: string;
    defaultSenderId?: string;
  }) {
    // Use SmsService to update settings
    return this.smsService.updateSmsSettings(settings);
  }

  @Get('sms/global-stats')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SMS global statistics' })
  @ApiResponse({ status: 200, description: 'SMS global statistics retrieved' })
  async getSmsGlobalStats() {
    return this.adminAnalyticsService.getSmsGlobalStats();
  }

  @Get('sms/gateway-balance')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SMS gateway balance' })
  @ApiResponse({ status: 200, description: 'SMS gateway balance retrieved' })
  async getSmsGatewayBalance() {
    const result = await this.smsService.getGatewayBalance();
    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('organizations')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organizations list' })
  @ApiResponse({ status: 200, description: 'Organizations list retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOrganizations(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminAnalyticsService.getOrganizationsList(+page, +limit);
  }

  @Get('users')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get users list' })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminAnalyticsService.getUsersList(+page, +limit);
  }

  @Get('subscriptions')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscriptions list' })
  @ApiResponse({ status: 200, description: 'Subscriptions list retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSubscriptions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.adminAnalyticsService.getSubscriptionsList(+page, +limit);
  }

  @Get('admins')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({ status: 200, description: 'Admins list retrieved' })
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  @Patch('admins/:id/deactivate')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate admin' })
  @ApiResponse({ status: 200, description: 'Admin deactivated successfully' })
  async deactivateAdmin(@Param('id') adminId: string) {
    return this.adminService.deactivateAdmin(adminId);
  }

  // Subscription Management
  @Post('subscriptions')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription for organization' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async createSubscription(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.adminAnalyticsService.createSubscription(createSubscriptionDto);
  }

  @Patch('subscriptions/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  async updateSubscription(
    @Param('id') subscriptionId: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.adminAnalyticsService.updateSubscription(subscriptionId, updateSubscriptionDto);
  }

  // Payment Management
  @Get('payments')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Payments list retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPayments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    // This would need to be implemented in the analytics service
    // For now, we'll return a simple response
    return { payments: [], total: 0 };
  }

  @Get('payments/statistics')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200, description: 'Payment statistics retrieved' })
  async getPaymentStatistics() {
    return this.adminAnalyticsService.getPaymentStatistics();
  }

  @Post('payments/:paymentId/refund')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() refundData: {
      trxId: string;
      amount: string;
      reason: string;
    },
  ) {
    return this.bkashService.refundPayment({
      paymentId,
      trxId: refundData.trxId,
      amount: refundData.amount,
      sku: 'subscription',
      reason: refundData.reason,
    });
  }

  @Get('subscriptions/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription details' })
  @ApiResponse({ status: 200, description: 'Subscription details retrieved' })
  async getSubscriptionDetails(@Param('id') subscriptionId: string) {
    return this.adminAnalyticsService.getSubscriptionDetails(subscriptionId);
  }

  @Delete('subscriptions/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete subscription' })
  @ApiResponse({ status: 200, description: 'Subscription deleted successfully' })
  async deleteSubscription(@Param('id') subscriptionId: string) {
    return this.adminAnalyticsService.deleteSubscription(subscriptionId);
  }

  // bKash Payment Management
  @Get('payments/bkash/analytics')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bKash payment analytics' })
  @ApiResponse({ status: 200, description: 'bKash payment analytics retrieved' })
  async getBkashPaymentAnalytics() {
    return this.adminAnalyticsService.getBkashPaymentAnalytics();
  }

  @Post('payments/bkash/fix-nulls')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fix null values in bKash payments' })
  @ApiResponse({ status: 200, description: 'bKash payment null values fixed' })
  async fixBkashPaymentNullValues() {
    return this.adminAnalyticsService.fixBkashPaymentNullValues();
  }
}

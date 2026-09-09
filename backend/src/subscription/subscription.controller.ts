import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole, SubscriptionPlan } from '../entities';
import { EditSubscriptionDto } from './dto/edit-subscription.dto';
import { DeleteSubscriptionDto } from './dto/delete-subscription.dto';

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  async getSubscription(@CurrentUser() user: User) {
    return this.subscriptionService.getSubscription(user.organizationId);
  }

  @Patch('upgrade')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription upgraded successfully' })
  async upgradeSubscription(
    @CurrentUser() user: User,
    @Body() body: { planType: SubscriptionPlan },
  ) {
    return this.subscriptionService.upgradeSubscription(
      user.organizationId,
      body.planType,
    );
  }

  @Patch('cancel')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelSubscription(@CurrentUser() user: User) {
    return this.subscriptionService.cancelSubscription(user.organizationId);
  }

  @Post('renew')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Renew subscription' })
  @ApiResponse({ status: 200, description: 'Subscription renewed successfully' })
  async renewSubscription(@CurrentUser() user: User) {
    return this.subscriptionService.renewSubscription(user.organizationId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Check if subscription is active' })
  @ApiResponse({ status: 200, description: 'Subscription status retrieved' })
  async checkSubscriptionStatus(@CurrentUser() user: User) {
    const isActive = await this.subscriptionService.isSubscriptionActive(user.organizationId);
    return { isActive };
  }

  @Post('purchase')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Purchase a subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription purchased successfully' })
  async purchaseSubscription(
    @CurrentUser() user: User,
    @Body() body: { planType: SubscriptionPlan, payerReference: string, paymentMethod?: 'bkash' | 'sslcommerz' },
  ) {
    const result = await this.subscriptionService.purchaseSubscription(
      user.organizationId,
      body.planType,
      body.payerReference,
      body.paymentMethod || 'bkash',
    );
    return result;
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'Available plans retrieved' })
  async getAvailablePlans() {
    return this.subscriptionService.getAvailablePlans();
  }

  @Get('debug/plans')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Debug: Get all subscription plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved for debugging' })
  async debugPlans(@CurrentUser() user: User) {
    return this.subscriptionService.debugGetAllPlans();
  }

  @Patch('edit')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Edit subscription details' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  async editSubscription(
    @CurrentUser() user: User,
    @Body() editSubscriptionDto: EditSubscriptionDto,
  ) {
    return this.subscriptionService.editSubscription(user.organizationId, editSubscriptionDto);
  }

  @Delete('delete')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Delete/Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription deleted successfully' })
  async deleteSubscription(
    @CurrentUser() user: User,
    @Body() deleteSubscriptionDto: DeleteSubscriptionDto,
  ) {
    return this.subscriptionService.deleteSubscription(user.organizationId, deleteSubscriptionDto?.id);
  }

  @Get('payment-history')
  @ApiOperation({ summary: 'Get payment history for subscription' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  async getPaymentHistory(@CurrentUser() user: User) {
    return this.subscriptionService.getPaymentHistory(user.organizationId);
  }

  @Get('invoice/:paymentId')
  @ApiOperation({ summary: 'Download invoice for a payment' })
  @ApiResponse({ status: 200, description: 'Invoice data retrieved successfully' })
  async getInvoice(
    @CurrentUser() user: User,
    @Param('paymentId') paymentId: string,
  ) {
    return this.subscriptionService.getInvoiceData(user.organizationId, paymentId);
  }
}

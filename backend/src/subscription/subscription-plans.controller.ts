import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionPlansService, CreatePlanDto, UpdatePlanDto } from './subscription-plans.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(private subscriptionPlansService: SubscriptionPlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active subscription plans' })
  @ApiResponse({ status: 200, description: 'Active subscription plans retrieved' })
  async getActivePlans() {
    return this.subscriptionPlansService.getActivePlans();
  }

  @Get('all')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all subscription plans (admin only)' })
  @ApiResponse({ status: 200, description: 'All subscription plans retrieved' })
  async getAllPlans() {
    return this.subscriptionPlansService.getAllPlans();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription plan by ID' })
  @ApiResponse({ status: 200, description: 'Subscription plan retrieved' })
  async getPlanById(@Param('id') id: string) {
    return this.subscriptionPlansService.getPlanById(id);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new subscription plan' })
  @ApiResponse({ status: 201, description: 'Subscription plan created' })
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    return this.subscriptionPlansService.createPlan(createPlanDto);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription plan updated' })
  async updatePlan(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.subscriptionPlansService.updatePlan(id, updatePlanDto);
  }

  @Patch(':id/toggle-status')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle subscription plan active status' })
  @ApiResponse({ status: 200, description: 'Subscription plan status toggled' })
  async togglePlanStatus(@Param('id') id: string) {
    return this.subscriptionPlansService.togglePlanStatus(id);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete subscription plan' })
  @ApiResponse({ status: 200, description: 'Subscription plan deleted' })
  async deletePlan(@Param('id') id: string) {
    await this.subscriptionPlansService.deletePlan(id);
    return { message: 'Subscription plan deleted successfully' };
  }

  @Post('init-default')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize default subscription plans' })
  @ApiResponse({ status: 200, description: 'Default plans initialized' })
  async initDefaultPlans() {
    await this.subscriptionPlansService.createDefaultPlans();
    return { message: 'Default subscription plans initialized' };
  }
}

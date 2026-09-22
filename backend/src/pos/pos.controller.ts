import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { GetFrontendType } from '../common/decorators/frontend-type.decorator';
import { FrontendType } from '../common/enums/frontend-type.enum';
import { AllowedFrontends } from '../common/guards/frontend-access.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateSaleDto, PosStatsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequiredPermission } from '../permissions/decorators/permission.decorator';
import { PermissionModuleType } from '../entities';

@ApiTags('POS')
@Controller('pos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('sales')
  @AllowedFrontends([FrontendType.POS_TERMINAL, FrontendType.ADMIN_DASHBOARD])
  @UseGuards(PermissionsGuard)
  @RequiredPermission(PermissionModuleType.POS, 'create')
  @ApiOperation({ summary: 'Create a new sale' })
  @ApiResponse({ status: 201, description: 'Sale created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or insufficient stock' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createSale(
    @Body() createSaleDto: CreateSaleDto, 
    @Request() req,
    @GetFrontendType() frontendType: FrontendType
  ) {
    console.log(`Sale created from ${frontendType}`);
    return this.posService.createSale(createSaleDto, req.user.organization);
  }

  @Get('sales/recent')
  @UseGuards(PermissionsGuard)
  @RequiredPermission(PermissionModuleType.POS, 'view')
  @ApiOperation({ summary: 'Get recent sales' })
  @ApiResponse({ status: 200, description: 'Recent sales retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getRecentSales(@Request() req, @Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.posService.getRecentSales(req.user.organization, limitNumber);
  }

  @Get('stats')
  @AllowedFrontends([FrontendType.ADMIN_DASHBOARD])
  @ApiOperation({ summary: 'Get POS statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getSalesStats(@Request() req, @Query() statsDto: PosStatsDto) {
    return this.posService.getSalesStats(req.user.organization, statsDto);
  }

  @Get('sales-stats')
  @ApiOperation({ summary: 'Get sales statistics for frontend dashboard' })
  @ApiResponse({ status: 200, description: 'Sales statistics retrieved successfully' })
  async getSalesPerformance(@Request() req, @Query() statsDto: PosStatsDto) {
    try {
      // Get basic stats from the existing method
      const baseStats = await this.posService.getSalesStats(req.user.organization, statsDto);
      
      // Format data for the frontend sales chart
      const { period = 'this-month' } = statsDto;
      const salesByPeriod = await this.posService.getSalesByPeriod(req.user.organization, period);
      
      // Return combined data in the format expected by the frontend
      return {
        totalSales: baseStats.totalSales || 0,
        totalOrders: baseStats.totalOrders || 0,
        averageOrderValue: baseStats.averageOrderValue || 0,
        topProducts: baseStats.topProducts || [],
        salesByPeriod: salesByPeriod || []
      };
    } catch (error) {
      console.error('Error in sales-stats endpoint:', error);
      // Return a default structure with empty data to prevent frontend errors
      return {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        topProducts: [],
        salesByPeriod: []
      };
    }
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top products retrieved successfully' })
  async getTopProducts(@Request() req, @Query() statsDto: PosStatsDto) {
    return this.posService.getTopProducts(req.user.organization, statsDto);
  }

  @Get('profit/total')
  @ApiOperation({ summary: 'Get total profit for a period' })
  @ApiResponse({ status: 200, description: 'Total profit retrieved successfully' })
  async getTotalProfit(@Request() req, @Query() statsDto: PosStatsDto) {
    return this.posService.getTotalProfit(req.user.organization, statsDto);
  }

  @Get('profit/by-product')
  @ApiOperation({ summary: 'Get profit breakdown by product' })
  @ApiResponse({ status: 200, description: 'Profit by product retrieved successfully' })
  async getProfitByProduct(@Request() req, @Query() statsDto: PosStatsDto) {
    return this.posService.getProfitByProduct(req.user.organization, statsDto);
  }

  @Get('profit/stats')
  @ApiOperation({ summary: 'Get comprehensive profit statistics' })
  @ApiResponse({ status: 200, description: 'Profit statistics retrieved successfully' })
  async getProfitStats(@Request() req, @Query() statsDto: PosStatsDto) {
    return this.posService.getProfitStats(req.user.organization, statsDto);
  }

  @Get('profit/by-payment-status/:paymentStatus')
  @ApiOperation({ summary: 'Get total profit filtered by payment status' })
  @ApiResponse({ status: 200, description: 'Profit by payment status retrieved successfully' })
  async getTotalProfitByPaymentStatus(@Request() req, @Param('paymentStatus') paymentStatus: string, @Query() statsDto: PosStatsDto) {
    return this.posService.getTotalProfitByPaymentStatus(req.user.organization, statsDto, paymentStatus);
  }

  @Get('system/check-cost-issues')
  @ApiOperation({ summary: 'Check for order items with incorrect unit costs' })
  @ApiResponse({ status: 200, description: 'Returns number of issues found' })
  async checkCostIssues(@Request() req) {
    const issuesFound = await this.posService.checkCostIssues(req.user.organization);
    return { issuesFound };
  }

  @Post('system/fix-cost-issues')
  @ApiOperation({ summary: 'Fix order items with incorrect unit costs' })
  @ApiResponse({ status: 200, description: 'Returns number of items fixed and totals' })
  async fixCostIssues(@Request() req) {
    const results = await this.posService.fixCostIssues(req.user.organization);
    return results;
  }
}

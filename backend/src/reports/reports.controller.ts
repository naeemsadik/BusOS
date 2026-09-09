import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales reports' })
  @ApiResponse({ status: 200, description: 'Sales reports retrieved successfully' })
  async getSalesReport(
    @Request() req,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(
      req.user.organization,
      { period, startDate, endDate },
    );
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get expense reports' })
  @ApiResponse({ status: 200, description: 'Expense reports retrieved successfully' })
  async getExpenseReport(
    @Request() req,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    return this.reportsService.getExpenseReport(
      req.user.organization,
      { period, startDate, endDate, year: yearNumber },
    );
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer reports' })
  @ApiResponse({ status: 200, description: 'Customer reports retrieved successfully' })
  async getCustomerReport(@Request() req) {
    return this.reportsService.getCustomerReport(req.user.organization);
  }
  
  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory reports' })
  @ApiResponse({ status: 200, description: 'Inventory reports retrieved successfully' })
  async getInventoryReport(@Request() req) {
    return this.reportsService.getInventoryReport(req.user.organization);
  }
}

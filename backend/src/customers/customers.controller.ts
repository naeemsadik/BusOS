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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 409, description: 'Customer with email already exists' })
  async create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
    return this.customersService.create(createCustomerDto, req.user.organization);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async findAll(@Query() query: CustomerQueryDto, @Request() req) {
    return this.customersService.findAll(query, req.user.organization);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  @ApiResponse({ status: 200, description: 'Customer statistics retrieved successfully' })
  async getStats(@Request() req) {
    return this.customersService.getCustomerStats(req.user.organization);
  }

  @Get('top')
  @ApiOperation({ summary: 'Get top customers by spending' })
  @ApiResponse({ status: 200, description: 'Top customers retrieved successfully' })
  async getTopCustomers(@Request() req, @Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.customersService.getTopCustomers(req.user.organization, limitNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.customersService.findOne(id, req.user.organization);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'Get customer orders' })
  @ApiResponse({ status: 200, description: 'Customer orders retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomerOrders(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.customersService.getCustomerOrders(id, req.user.organization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @Request() req,
  ) {
    return this.customersService.update(id, updateCustomerDto, req.user.organization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete customer with orders' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.customersService.remove(id, req.user.organization);
    return { message: 'Customer deleted successfully' };
  }

  @Patch(':id/update-stats')
  async updateCustomerStats(
    @Param('id') id: string,
    @Body('orderValue') orderValue: number,
    @Request() req
  ): Promise<void> {
    return this.customersService.updateCustomerStats(id, req.user.organization, orderValue);
  }
}

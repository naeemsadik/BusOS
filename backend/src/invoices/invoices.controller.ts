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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async create(@Body() createInvoiceDto: CreateInvoiceDto, @Request() req) {
    return this.invoicesService.create(createInvoiceDto, req.user.organization);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async findAll(@Query() query: InvoiceQueryDto, @Request() req) {
    return this.invoicesService.findAll(query, req.user.organization);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get invoice statistics' })
  @ApiResponse({ status: 200, description: 'Invoice statistics retrieved successfully' })
  async getStats(@Request() req) {
    return this.invoicesService.getInvoiceStats(req.user.organization);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue invoices' })
  @ApiResponse({ status: 200, description: 'Overdue invoices retrieved successfully' })
  async getOverdueInvoices(@Request() req) {
    return this.invoicesService.getOverdueInvoices(req.user.organization);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.invoicesService.findOne(id, req.user.organization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Request() req,
  ) {
    return this.invoicesService.update(id, updateInvoiceDto, req.user.organization);
  }

  @Patch(':id/send')
  @ApiOperation({ summary: 'Mark invoice as sent' })
  @ApiResponse({ status: 200, description: 'Invoice marked as sent successfully' })
  @ApiResponse({ status: 400, description: 'Only draft invoices can be sent' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async markAsSent(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.invoicesService.markAsSent(id, req.user.organization);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid successfully' })
  @ApiResponse({ status: 400, description: 'Invoice cannot be marked as paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async markAsPaid(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.invoicesService.markAsPaid(id, req.user.organization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete invoice' })
  @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: 400, description: 'Only draft invoices can be deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.invoicesService.remove(id, req.user.organization);
    return { message: 'Invoice deleted successfully' };
  }

  @Post('from-order/:orderId')
  @ApiOperation({ summary: 'Create invoice from order' })
  @ApiResponse({ status: 201, description: 'Invoice created from order successfully' })
  @ApiResponse({ status: 400, description: 'Invoice already exists for this order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createFromOrder(@Param('orderId', ParseUUIDPipe) orderId: string, @Request() req) {
    return this.invoicesService.createFromOrder(orderId, req.user.organization);
  }
}

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
import { SupplierService } from '../services';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  SupplierQueryDto,
  BulkDeleteSuppliersDto,
  UpdateSupplierStatsDto,
} from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  @ApiResponse({ status: 409, description: 'Supplier with email already exists' })
  async create(@Body() createSupplierDto: CreateSupplierDto, @Request() req) {
    return this.supplierService.create(createSupplierDto, req.user.organization);
  }

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  async findAll(@Query() query: SupplierQueryDto, @Request() req) {
    const result = await this.supplierService.findAll(query, req.user.organization);
    return {
      suppliers: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      filters: result.filters
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get supplier statistics' })
  @ApiResponse({ status: 200, description: 'Supplier statistics retrieved successfully' })
  async getStats(@Request() req) {
    return this.supplierService.getSupplierStats(req.user.organization);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.supplierService.findOne(id, req.user.organization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Request() req,
  ) {
    return this.supplierService.update(id, updateSupplierDto, req.user.organization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete supplier' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.supplierService.remove(id, req.user.organization);
    return { message: 'Supplier deleted successfully' };
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Delete multiple suppliers' })
  @ApiResponse({ status: 200, description: 'Suppliers deleted successfully' })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteSuppliersDto, @Request() req) {
    return this.supplierService.bulkDelete(bulkDeleteDto, req.user.organization);
  }

  @Patch(':id/stats')
  @ApiOperation({ summary: 'Update supplier statistics' })
  @ApiResponse({ status: 200, description: 'Supplier stats updated successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async updateStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatsDto: UpdateSupplierStatsDto,
    @Request() req,
  ) {
    return this.supplierService.updateStats(id, updateStatsDto, req.user.organization);
  }
}

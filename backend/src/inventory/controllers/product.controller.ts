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
import { ProductService } from '../services';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  BulkDeleteDto,
  StockAdjustmentDto,
} from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    return this.productService.create(createProductDto, req.user.organization);
  }

  @Get()
  async findAll(@Query() query: ProductQueryDto, @Request() req) {
    return this.productService.findAll(query, req.user.organization);
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.productService.getInventoryStats(req.user.organization);
  }

  @Get('categories')
  async getCategories(@Request() req) {
    return this.productService.getCategories(req.user.organization);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.productService.findOne(id, req.user.organization);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    return this.productService.update(id, updateProductDto, req.user.organization);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.productService.remove(id, req.user.organization);
    return { message: 'Product deleted successfully' };
  }

  @Post('bulk-delete')
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto, @Request() req) {
    try {
      return await this.productService.bulkDelete(bulkDeleteDto, req.user.organization);
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/adjust-stock')
  async adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() stockAdjustmentDto: StockAdjustmentDto,
    @Request() req,
  ) {
    return this.productService.adjustStock(
      { ...stockAdjustmentDto, productId: id },
      req.user.organization,
      req.user,
    );
  }

  @Post(':id/generate-barcode')
  async generateBarcode(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const barcode = await this.productService.generateBarcode(id, req.user.organization);
    return { barcode };
  }

  @Get(':id/stock-movements')
  async getStockMovements(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.productService.getStockMovements(id, req.user.organization);
  }
}

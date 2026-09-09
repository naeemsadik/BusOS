import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CategoryService } from '../services';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto, @Request() req) {
    return this.categoryService.create(createCategoryDto, req.user.organization);
  }

  @Get()
  async findAll(@Request() req) {
    return this.categoryService.findAll(req.user.organization);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.categoryService.findOne(id, req.user.organization);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req,
  ) {
    return this.categoryService.update(id, updateCategoryDto, req.user.organization);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.categoryService.remove(id, req.user.organization);
    return { message: 'Category deleted successfully' };
  }
}

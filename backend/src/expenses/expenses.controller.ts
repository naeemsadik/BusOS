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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new expense' })
  @ApiResponse({ status: 201, description: 'Expense created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async create(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
    return this.expensesService.create(createExpenseDto, req.user.organization);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expenses' })
  @ApiResponse({ status: 200, description: 'Expenses retrieved successfully' })
  async findAll(@Query() query: ExpenseQueryDto, @Request() req) {
    return this.expensesService.findAll(query, req.user.organization);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get expense statistics' })
  @ApiResponse({ status: 200, description: 'Expense statistics retrieved successfully' })
  async getStats(@Request() req) {
    return this.expensesService.getExpenseStats(req.user.organization);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get expenses by category' })
  @ApiResponse({ status: 200, description: 'Expenses by category retrieved successfully' })
  async getExpensesByCategory(@Request() req) {
    return this.expensesService.getExpensesByCategory(req.user.organization);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly expenses' })
  @ApiResponse({ status: 200, description: 'Monthly expenses retrieved successfully' })
  async getMonthlyExpenses(@Request() req, @Query('year') year?: string) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    return this.expensesService.getMonthlyExpenses(req.user.organization, yearNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiResponse({ status: 200, description: 'Expense retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.expensesService.findOne(id, req.user.organization);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update expense' })
  @ApiResponse({ status: 200, description: 'Expense updated successfully' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Request() req,
  ) {
    return this.expensesService.update(id, updateExpenseDto, req.user.organization);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete expense' })
  @ApiResponse({ status: 200, description: 'Expense deleted successfully' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.expensesService.remove(id, req.user.organization);
    return { message: 'Expense deleted successfully' };
  }
}

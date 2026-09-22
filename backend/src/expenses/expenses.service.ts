import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Expense, Organization } from '../entities';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto';

@Injectable()
export class ExpensesService {
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto, organization: Organization): Promise<Expense> {
    const expense = this.expenseRepository.create({
      ...createExpenseDto,
      organizationId: organization.id,
    });

    return this.expenseRepository.save(expense);
  }

  async findAll(query: ExpenseQueryDto, organization: Organization): Promise<{
    expenses: Expense[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      category,
      vendor,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.organizationId = :organizationId', { organizationId: organization.id });

    if (search) {
      const escapedSearch = this.escapeLikePattern(search);
      queryBuilder.andWhere(
        '(expense.title ILIKE :search ESCAPE \'\\\' OR expense.description ILIKE :search ESCAPE \'\\\' OR expense.vendor ILIKE :search ESCAPE \'\\\')',
        { search: '%' + escapedSearch + '%' }
      );
    }

    if (category) {
      queryBuilder.andWhere('expense.category = :category', { category });
    }

    if (vendor) {
      const escapedVendor = this.escapeLikePattern(vendor);
      queryBuilder.andWhere('expense.vendor ILIKE :vendor ESCAPE \'\\\'', {
        vendor: '%' + escapedVendor + '%',
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('expense.expenseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('expense.amount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('expense.amount <= :maxAmount', { maxAmount });
    }

    const total = await queryBuilder.getCount();
    const expenses = await queryBuilder
      .orderBy('expense.expenseDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, organization: Organization): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id, organizationId: organization.id },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto, organization: Organization): Promise<Expense> {
    await this.findOne(id, organization); // Validate expense exists

    await this.expenseRepository.update(id, updateExpenseDto);
    return this.findOne(id, organization);
  }

  async remove(id: string, organization: Organization): Promise<void> {
    const expense = await this.findOne(id, organization);
    await this.expenseRepository.remove(expense);
  }

  async getExpenseStats(organization: Organization): Promise<any> {
    const expenses = await this.expenseRepository.find({
      where: { organizationId: organization.id },
    });

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const currentMonthExpenses = expenses.filter(
      expense => new Date(expense.expenseDate) >= currentMonth
    );

    const stats = {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
      currentMonthAmount: currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
      averageAmount: expenses.length > 0 ? expenses.reduce((sum, expense) => sum + Number(expense.amount), 0) / expenses.length : 0,
      categoriesBreakdown: this.getCategoriesBreakdown(expenses),
    };

    return stats;
  }

  async getExpensesByCategory(organization: Organization): Promise<any> {
    const expenses = await this.expenseRepository.find({
      where: { organizationId: organization.id },
    });

    return this.getCategoriesBreakdown(expenses);
  }

  async getMonthlyExpenses(organization: Organization, year?: number): Promise<any> {
    const targetYear = year || new Date().getFullYear();
    
    const startDate = new Date(targetYear, 0, 1); // January 1st
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59); // December 31st

    const expenses = await this.expenseRepository.find({
      where: { 
        organizationId: organization.id,
        expenseDate: Between(startDate, endDate),
      },
      order: { expenseDate: 'ASC' },
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(targetYear, i).toLocaleString('default', { month: 'long' }),
      amount: 0,
      count: 0,
    }));

    expenses.forEach(expense => {
      const month = new Date(expense.expenseDate).getMonth();
      monthlyData[month].amount += Number(expense.amount);
      monthlyData[month].count += 1;
    });

    return {
      year: targetYear,
      data: monthlyData,
      totalAmount: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
      totalCount: expenses.length,
    };
  }

  private getCategoriesBreakdown(expenses: Expense[]): any {
    const categoriesMap = new Map();

    expenses.forEach(expense => {
      const category = expense.category;
      if (categoriesMap.has(category)) {
        const existing = categoriesMap.get(category);
        existing.amount += Number(expense.amount);
        existing.count += 1;
      } else {
        categoriesMap.set(category, {
          category,
          amount: Number(expense.amount),
          count: 1,
        });
      }
    });

    return Array.from(categoriesMap.values()).sort((a, b) => b.amount - a.amount);
  }
}

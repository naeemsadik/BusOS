import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, QueryFailedError, Not } from 'typeorm';
import { Customer, Order, Organization } from '../entities';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, organization: Organization): Promise<Customer> {
    const customer = this.customerRepository.create({
      ...createCustomerDto,
      organizationId: organization.id,
    });

    const savedCustomer = await this.customerRepository.save(customer);

    return savedCustomer;
  }

  async findAll(query: CustomerQueryDto, organization: Organization): Promise<{
    customers: Customer[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      status,
      city,
      state,
      country,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.organizationId = :organizationId', { organizationId: organization.id });

    if (search) {
      const escapedSearch = this.escapeLikePattern(search);
      queryBuilder.andWhere(
        '(customer.name ILIKE :search ESCAPE \'\\\' OR customer.email ILIKE :search ESCAPE \'\\\' OR customer.phone ILIKE :search ESCAPE \'\\\')',
        { search: '%' + escapedSearch + '%' }
      );
    }

    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    if (city) {
      const escapedCity = this.escapeLikePattern(city);
      queryBuilder.andWhere('customer.city ILIKE :city ESCAPE \'\\\'', {
        city: '%' + escapedCity + '%',
      });
    }

    if (state) {
      const escapedState = this.escapeLikePattern(state);
      queryBuilder.andWhere('customer.state ILIKE :state ESCAPE \'\\\'', {
        state: '%' + escapedState + '%',
      });
    }

    if (country) {
      const escapedCountry = this.escapeLikePattern(country);
      queryBuilder.andWhere('customer.country ILIKE :country ESCAPE \'\\\'', {
        country: '%' + escapedCountry + '%',
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('customer.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const total = await queryBuilder.getCount();
    const customers = await queryBuilder
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, organization: Organization): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, organizationId: organization.id },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, organization: Organization): Promise<Customer> {
    const customer = await this.findOne(id, organization);
    await this.customerRepository.update(id, updateCustomerDto);
    
    return await this.findOne(id, organization);
  }

  async remove(id: string, organization: Organization): Promise<void> {
    const customer = await this.findOne(id, organization);

    // Check if customer has orders
    const orderCount = await this.orderRepository.count({
      where: { customerId: id },
    });

    if (orderCount > 0) {
      throw new ConflictException('Cannot delete customer with existing orders');
    }

    await this.customerRepository.remove(customer);
  }

  async getCustomerStats(organization: Organization): Promise<any> {
    const customers = await this.customerRepository.find({
      where: { organizationId: organization.id },
    });

    const stats = {
      total: customers.length,
      active: customers.filter(c => c.status === 'active').length,
      inactive: customers.filter(c => c.status === 'inactive').length,
      blocked: customers.filter(c => c.status === 'blocked').length,
      totalSpent: customers.reduce((sum, customer) => sum + Number(customer.totalSpent), 0),
      averageSpent: customers.length > 0 
        ? customers.reduce((sum, customer) => sum + Number(customer.totalSpent), 0) / customers.length 
        : 0,
    };

    return stats;
  }

  async getCustomerOrders(id: string, organization: Organization): Promise<Order[]> {
    await this.findOne(id, organization); // Validate customer exists

    return this.orderRepository.find({
      where: { customerId: id },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTopCustomers(organization: Organization, limit: number = 10): Promise<Customer[]> {
    return this.customerRepository.find({
      where: { organizationId: organization.id },
      order: { totalSpent: 'DESC' },
      take: limit,
    });
  }

  async updateCustomerStats(id: string, organization: Organization, orderValue: number): Promise<void> {
    const customer = await this.findOne(id, organization);
    
    // Update total spent and order count
    await this.customerRepository.update(id, {
      totalSpent: Number(customer.totalSpent) + orderValue,
      totalOrders: customer.totalOrders + 1,
      lastOrderDate: new Date(),
    });
  }
}

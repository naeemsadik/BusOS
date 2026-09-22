import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlanEntity, SubscriptionPlan } from '../entities';

export interface CreatePlanDto {
  name: string;
  planType: SubscriptionPlan;
  description?: string;
  price: number;
  currency?: string;
  durationDays?: number;
  features?: string[];
  maxUsers?: number;
  maxInventoryItems?: number;
  isActive?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {}

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private planRepository: Repository<SubscriptionPlanEntity>,
  ) {}

  async createPlan(createPlanDto: CreatePlanDto): Promise<SubscriptionPlanEntity> {
    // Check if plan type already exists
    const existingPlan = await this.planRepository.findOne({
      where: { planType: createPlanDto.planType },
    });

    if (existingPlan) {
      throw new BadRequestException('A plan with this type already exists');
    }

    const plan = this.planRepository.create({
      ...createPlanDto,
      currency: createPlanDto.currency || 'USD',
      durationDays: createPlanDto.durationDays || 30,
      isActive: createPlanDto.isActive !== undefined ? createPlanDto.isActive : true,
      isPopular: createPlanDto.isPopular || false,
      sortOrder: createPlanDto.sortOrder || 0,
    });

    return this.planRepository.save(plan);
  }

  async getAllPlans(): Promise<SubscriptionPlanEntity[]> {
    return this.planRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async getActivePlans(): Promise<SubscriptionPlanEntity[]> {
    return this.planRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async getPlanById(id: string): Promise<SubscriptionPlanEntity> {
    const plan = await this.planRepository.findOne({ where: { id } });
    
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  async getPlanByType(planType: SubscriptionPlan): Promise<SubscriptionPlanEntity> {
    const plan = await this.planRepository.findOne({ where: { planType } });
    
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  async updatePlan(id: string, updatePlanDto: UpdatePlanDto): Promise<SubscriptionPlanEntity> {
    const plan = await this.getPlanById(id);

    // If updating planType, check if it already exists
    if (updatePlanDto.planType && updatePlanDto.planType !== plan.planType) {
      const existingPlan = await this.planRepository.findOne({
        where: { planType: updatePlanDto.planType },
      });

      if (existingPlan) {
        throw new BadRequestException('A plan with this type already exists');
      }
    }

    Object.assign(plan, updatePlanDto);
    return this.planRepository.save(plan);
  }

  async deletePlan(id: string): Promise<void> {
    const plan = await this.getPlanById(id);
    await this.planRepository.remove(plan);
  }

  async togglePlanStatus(id: string): Promise<SubscriptionPlanEntity> {
    const plan = await this.getPlanById(id);
    plan.isActive = !plan.isActive;
    return this.planRepository.save(plan);
  }

  // Create default plans if they don't exist
  async createDefaultPlans(): Promise<void> {
    const existingPlans = await this.planRepository.count();
    
    if (existingPlans > 0) {
      return; // Plans already exist
    }

    const defaultPlans = [
      {
        name: 'Trial Plan',
        planType: SubscriptionPlan.TRIAL,
        description: 'Try our service for free for 7 days',
        price: 0,
        durationDays: 7,
        features: ['Basic inventory management', 'Up to 5 staff members', 'Email support'],
        maxUsers: 5,
        maxInventoryItems: 100,
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Basic Plan',
        planType: SubscriptionPlan.BASIC,
        description: 'Perfect for small businesses',
        price: 29,
        durationDays: 30,
        features: ['Unlimited inventory items', 'Up to 10 staff members', 'Basic reporting', 'Email support'],
        maxUsers: 10,
        maxInventoryItems: undefined,
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Premium Plan',
        planType: SubscriptionPlan.PREMIUM,
        description: 'For growing businesses',
        price: 99,
        durationDays: 30,
        features: ['Everything in Basic', 'Up to 50 staff members', 'Advanced reporting', 'Priority support', 'API access'],
        maxUsers: 50,
        maxInventoryItems: undefined,
        isActive: true,
        isPopular: true,
        sortOrder: 3,
      },
      {
        name: 'Enterprise Plan',
        planType: SubscriptionPlan.ENTERPRISE,
        description: 'For large organizations',
        price: 299,
        durationDays: 30,
        features: ['Everything in Premium', 'Unlimited staff members', 'Custom integrations', 'Dedicated support', 'White label'],
        maxUsers: undefined,
        maxInventoryItems: undefined,
        isActive: true,
        sortOrder: 4,
      },
    ];

    for (const planData of defaultPlans) {
      const plan = this.planRepository.create(planData);
      await this.planRepository.save(plan);
    }
  }
}

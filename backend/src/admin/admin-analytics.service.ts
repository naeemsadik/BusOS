import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between, LessThanOrEqual } from 'typeorm';
import { User, Organization, Subscription, UserRole, SubscriptionStatus, SubscriptionPlan, SubscriptionPlanEntity, BkashPayment, SslcommerzPayment, SmsBalance, SmsLog, SmsPackage, SmsSettings } from '../entities';
import { SmsPackageStatus } from '../entities/sms-package.entity';
import { SmsStatus } from '../entities/sms-log.entity';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlanEntity)
    private planRepository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(BkashPayment)
    private bkashPaymentRepository: Repository<BkashPayment>,
    @InjectRepository(SslcommerzPayment)
    private sslcommerzPaymentRepository: Repository<SslcommerzPayment>,
    @InjectRepository(SmsBalance)
    private smsBalanceRepository: Repository<SmsBalance>,
    @InjectRepository(SmsLog)
    private smsLogRepository: Repository<SmsLog>,
    @InjectRepository(SmsPackage)
    private smsPackageRepository: Repository<SmsPackage>,
    @InjectRepository(SmsSettings)
    private smsSettingsRepository: Repository<SmsSettings>,
  ) {}

  async getDashboardStats() {
    const [
      totalOrganizations,
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      ownerCount,
      staffCount,
      trialSubscriptions,
      expiredSubscriptions,
      smsStats,
    ] = await Promise.all([
      this.organizationRepository.count(),
      this.userRepository.count(),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.calculateTotalRevenue(),
      this.userRepository.count({ where: { role: UserRole.OWNER } }),
      this.userRepository.count({ where: { role: UserRole.STAFF } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.TRIAL } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.getSmsStatsForDashboard(),
    ]);

    return {
      totalOrganizations,
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      ownerCount,
      staffCount,
      trialSubscriptions,
      expiredSubscriptions,
      // SMS stats
      smsBalance: smsStats.totalBalance,
      smsBalanceStatus: smsStats.status,
      todaySMSSent: smsStats.todaySent,
      monthlySMSSent: smsStats.monthlySent,
    };
  }

  async getSubscriptionAnalytics() {
    try {
      const subscriptionsByPlan = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select('subscription.plan', 'plan')
        .addSelect('COUNT(*)', 'count')
        .groupBy('subscription.plan')
        .getRawMany();

      const subscriptionsByStatus = await this.subscriptionRepository
        .createQueryBuilder('subscription')
        .select('subscription.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('subscription.status')
        .getRawMany();

      const monthlyRevenue = await this.getMonthlyRevenue();
      const planRevenue = await this.getPlanRevenue();

      return {
        subscriptionsByPlan,
        subscriptionsByStatus,
        monthlyRevenue,
        planRevenue,
      };
    } catch (error) {
      throw error;
    }
  }

  async getOrganizationsList(page: number = 1, limit: number = 10) {
    const [organizations, total] = await this.organizationRepository.findAndCount({
      relations: ['subscription', 'users'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const organizationsWithStats = await Promise.all(organizations.map(async org => ({
      id: org.id,
      name: org.name || 'Unknown Organization',
      email: org.users?.find(u => u.role === UserRole.OWNER)?.email || 'No Owner Email',
      userCount: org.users?.length || 0,
      ownerCount: org.users?.filter(u => u.role === UserRole.OWNER)?.length || 0,
      staffCount: org.users?.filter(u => u.role === UserRole.STAFF)?.length || 0,
      subscription: org.subscription ? {
        plan: org.subscription.plan,
        status: org.subscription.status,
        endDate: org.subscription.endDate,
        price: await this.getPriceForPlan(org.subscription.plan),
      } : null,
      createdAt: org.createdAt,
    })));

    return {
      organizations: organizationsWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUsersList(page: number = 1, limit: number = 10) {
    const [users, total] = await this.userRepository.findAndCount({
      relations: ['organization'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const usersWithOrganization = users.map(user => ({
      id: user.id,
      email: user.email || 'No Email',
      firstName: user.firstName || 'Unknown',
      lastName: user.lastName || 'User',
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified || false,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name || 'Unknown Organization',
      } : null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    }));

    return {
      users: usersWithOrganization,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSubscriptionsList(page: number = 1, limit: number = 10) {
    const [subscriptions, total] = await this.subscriptionRepository.findAndCount({
      relations: ['organization'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const subscriptionsWithDetails = await Promise.all(subscriptions.map(async sub => ({
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      price: await this.getPriceForPlan(sub.plan),
      startDate: sub.startDate,
      endDate: sub.endDate,
      trialEndDate: sub.trialEndDate,
      autoRenew: sub.autoRenew || false,
      organization: {
        id: sub.organization.id,
        name: sub.organization.name || 'Unknown Organization',
      },
      createdAt: sub.createdAt,
    })));

    return {
      subscriptions: subscriptionsWithDetails,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async calculateTotalRevenue(): Promise<number> {
    // Calculate ALL-TIME revenue from successful payments (not just current month)
    let subscriptionRevenue = 0;

    // Get ALL subscription revenue from bKash payments (exclude SMS payments)
    const bkashPayments = await this.bkashPaymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'Completed' })
      .andWhere('(payment.merchantInvoiceNumber NOT LIKE :smsPrefix OR payment.merchantInvoiceNumber IS NULL)', { smsPrefix: 'SMS-%' })
      .getMany();

    for (const payment of bkashPayments) {
      const amount = Number(payment.amount);
      const refund = payment.refundAmount ? Number(payment.refundAmount) : 0;
      subscriptionRevenue += amount;
      // Subtract refund amounts if any
      if (payment.refundAmount) {
        subscriptionRevenue -= refund;
      }
    }

    // Get ALL subscription revenue from SSLCommerz payments (exclude SMS payments)
    const sslcommerzPayments = await this.sslcommerzPaymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: 'VALID' })
      .andWhere('(payment.merchantInvoiceNumber NOT LIKE :smsPrefix OR payment.merchantInvoiceNumber IS NULL)', { smsPrefix: 'SMS-%' })
      .getMany();

    for (const payment of sslcommerzPayments) {
      const amount = Number(payment.amount);
      const refund = payment.refundAmount ? Number(payment.refundAmount) : 0;
      subscriptionRevenue += amount;
      // Subtract refund amounts if any
      if (payment.refundAmount) {
        subscriptionRevenue -= refund;
      }
    }

    // Get ALL-TIME SMS revenue (actual cost from totalAmount field)
    const smsRevenueResult = await this.smsPackageRepository
      .createQueryBuilder('package')
      .select('SUM(package.totalAmount)', 'totalRevenue')
      .where('package.status = :status', { status: 'completed' })
      .getRawOne();

    const smsRevenue = parseFloat(smsRevenueResult?.totalRevenue || '0');

    const totalRevenue = subscriptionRevenue + smsRevenue;

    // Return total revenue (subscriptions + SMS)
    return totalRevenue;
  }

  private async getMonthlyRevenue() {
    try {
      // Group by month and calculate net revenue (payments - refunds)
      const monthlyData = new Map<string, number>();

      // Get all completed bKash payments
      const bkashPayments = await this.bkashPaymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'Completed' })
        .andWhere('payment.paymentExecuteTime IS NOT NULL')
        .getMany();
      
      for (const payment of bkashPayments) {
        if (payment.paymentExecuteTime) {
          const month = payment.paymentExecuteTime.toISOString().substring(0, 7); // YYYY-MM format
          const amount = Number(payment.amount);
          const refundAmount = payment.refundAmount ? Number(payment.refundAmount) : 0;
          const netAmount = amount - refundAmount;
          
          monthlyData.set(month, (monthlyData.get(month) || 0) + netAmount);
        }
      }

      // Get all valid SSLCommerz payments
      const sslcommerzPayments = await this.sslcommerzPaymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'VALID' })
        .andWhere('payment.validationTime IS NOT NULL')
        .getMany();
      
      for (const payment of sslcommerzPayments) {
        if (payment.validationTime) {
          const month = payment.validationTime.toISOString().substring(0, 7); // YYYY-MM format
          const amount = Number(payment.amount);
          const refundAmount = payment.refundAmount ? Number(payment.refundAmount) : 0;
          const netAmount = amount - refundAmount;
          
          monthlyData.set(month, (monthlyData.get(month) || 0) + netAmount);
        }
      }

      // Convert to array format and sort by month descending
      const result = Array.from(monthlyData.entries())
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);

      return result;
    } catch (error) {
      return [];
    }
  }

  private async getPlanRevenue() {
    try {
      // Group by plan type extracted from merchant invoice number
      const planData = new Map<string, { count: number; revenue: number }>();

      // Get all completed bKash payments with merchant invoice numbers
      const bkashPayments = await this.bkashPaymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'Completed' })
        .andWhere('payment.merchantInvoiceNumber LIKE :pattern', { pattern: 'sub_%' })
        .getMany();
      
      for (const payment of bkashPayments) {
        // Extract plan from merchant invoice number: sub_orgId_planType_timestamp
        const parts = payment.merchantInvoiceNumber.split('_');
        if (parts.length >= 3) {
          const planType = parts[2];
          const amount = Number(payment.amount);
          const refundAmount = payment.refundAmount ? Number(payment.refundAmount) : 0;
          const netAmount = amount - refundAmount;
          
          if (!planData.has(planType)) {
            planData.set(planType, { count: 0, revenue: 0 });
          }
          
          const current = planData.get(planType)!;
          current.count += 1;
          current.revenue += netAmount;
        }
      }

      // Get all valid SSLCommerz payments with merchant invoice numbers
      const sslcommerzPayments = await this.sslcommerzPaymentRepository
        .createQueryBuilder('payment')
        .where('payment.status = :status', { status: 'VALID' })
        .andWhere('payment.merchantInvoiceNumber LIKE :pattern', { pattern: 'sub_%' })
        .getMany();
      
      for (const payment of sslcommerzPayments) {
        // Extract plan from merchant invoice number: sub_orgId_planType_timestamp
        const parts = payment.merchantInvoiceNumber?.split('_') || [];
        if (parts.length >= 3) {
          const planType = parts[2];
          const amount = Number(payment.amount);
          const refundAmount = payment.refundAmount ? Number(payment.refundAmount) : 0;
          const netAmount = amount - refundAmount;
          
          if (!planData.has(planType)) {
            planData.set(planType, { count: 0, revenue: 0 });
          }
          
          const current = planData.get(planType)!;
          current.count += 1;
          current.revenue += netAmount;
        }
      }

      // Convert to array format
      const result = Array.from(planData.entries()).map(([plan, data]) => ({
        plan,
        count: data.count,
        revenue: data.revenue,
      }));

      return result;
    } catch (error) {
      return [];
    }
  }

  private async getPriceForPlan(plan: SubscriptionPlan): Promise<number> {
    try {
      const planEntity = await this.planRepository.findOne({ 
        where: { planType: plan, isActive: true } 
      });
      return planEntity ? Number(planEntity.price) : 0;
    } catch (error) {
      // Fallback to hardcoded values if database query fails
      const fallbackPrices = {
        [SubscriptionPlan.TRIAL]: 0,
        [SubscriptionPlan.BASIC]: 0.50,
        [SubscriptionPlan.PREMIUM]: 99,
        [SubscriptionPlan.ENTERPRISE]: 299,
      };
      return fallbackPrices[plan] || 0;
    }
  }

  // Subscription Management Methods
  async createSubscription(createSubscriptionDto: any) {
    const { organizationId, plan, startDate, endDate, autoRenew = true } = createSubscriptionDto;

    // Check if organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if organization already has a subscription
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { organization: { id: organizationId } },
    });

    if (existingSubscription) {
      throw new ConflictException('Organization already has a subscription');
    }

    // Create default dates if not provided
    const subscriptionStartDate = startDate ? new Date(startDate) : new Date();
    const subscriptionEndDate = endDate ? new Date(endDate) : (() => {
      const end = new Date(subscriptionStartDate);
      end.setDate(end.getDate() + 30); // Default 30 days
      return end;
    })();

    // Create new subscription
    const subscription = new Subscription();
    subscription.organization = organization;
    subscription.plan = plan;
    subscription.status = plan === SubscriptionPlan.TRIAL ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;
    subscription.startDate = subscriptionStartDate;
    subscription.endDate = subscriptionEndDate;
    subscription.trialEndDate = plan === SubscriptionPlan.TRIAL ? subscriptionEndDate : null;
    subscription.autoRenew = autoRenew;
    subscription.nextPaymentDate = plan !== SubscriptionPlan.TRIAL ? subscriptionEndDate : null;
    subscription.hasUsedTrial = plan === SubscriptionPlan.TRIAL;
    const savedSubscription = await this.subscriptionRepository.save(subscription);

    return {
      id: savedSubscription.id,
      plan: savedSubscription.plan,
      status: savedSubscription.status,
      price: await this.getPriceForPlan(savedSubscription.plan),
      startDate: savedSubscription.startDate,
      endDate: savedSubscription.endDate,
      trialEndDate: savedSubscription.trialEndDate,
      autoRenew: savedSubscription.autoRenew,
      organization: {
        id: organization.id,
        name: organization.name,
      },
      createdAt: savedSubscription.createdAt,
    };
  }

  async updateSubscription(subscriptionId: string, updateSubscriptionDto: any) {
    const { plan, endDate, autoRenew } = updateSubscriptionDto;

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['organization'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (plan) {
      subscription.plan = plan;
      subscription.status = plan === SubscriptionPlan.TRIAL ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;
    }

    if (endDate) {
      subscription.endDate = new Date(endDate);
      if (subscription.plan !== SubscriptionPlan.TRIAL) {
        subscription.nextPaymentDate = new Date(endDate);
      }
    }

    if (autoRenew !== undefined) {
      subscription.autoRenew = autoRenew;
    }

    const updatedSubscription = await this.subscriptionRepository.save(subscription);

    return {
      id: updatedSubscription.id,
      plan: updatedSubscription.plan,
      status: updatedSubscription.status,
      price: await this.getPriceForPlan(updatedSubscription.plan),
      startDate: updatedSubscription.startDate,
      endDate: updatedSubscription.endDate,
      trialEndDate: updatedSubscription.trialEndDate,
      autoRenew: updatedSubscription.autoRenew,
      organization: {
        id: updatedSubscription.organization.id,
        name: updatedSubscription.organization.name,
      },
      updatedAt: updatedSubscription.updatedAt,
    };
  }

  async getSubscriptionDetails(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['organization'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      price: await this.getPriceForPlan(subscription.plan),
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      trialEndDate: subscription.trialEndDate,
      autoRenew: subscription.autoRenew,
      organization: {
        id: subscription.organization.id,
        name: subscription.organization.name,
      },
      createdAt: subscription.createdAt,
    };
  }

  async deleteSubscription(subscriptionId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['organization'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.subscriptionRepository.remove(subscription);

    return {
      message: 'Subscription deleted successfully',
      deletedSubscription: {
        id: subscription.id,
        organizationName: subscription.organization.name,
        plan: subscription.plan,
        status: subscription.status,
      },
    };
  }

  // Fix null values in bkash payments
  async fixBkashPaymentNullValues() {
    try {
      const paymentsWithNulls = await this.bkashPaymentRepository
        .createQueryBuilder('payment')
        .where('payment.paymentCreateTime IS NULL OR payment.paymentExecuteTime IS NULL OR payment.updateTime IS NULL')
        .getMany();

      let fixedCount = 0;
      const now = new Date();

      for (const payment of paymentsWithNulls) {
        let hasChanges = false;

        // Fill payment create time if null (use created_at as fallback)
        if (!payment.paymentCreateTime) {
          payment.paymentCreateTime = payment.createdAt || now;
          hasChanges = true;
        }

        // Fill payment execute time if null and status is Completed
        if (!payment.paymentExecuteTime && payment.status === 'Completed') {
          payment.paymentExecuteTime = payment.updatedAt || payment.createdAt || now;
          hasChanges = true;
        }

        // Fill update time if null
        if (!payment.updateTime) {
          payment.updateTime = payment.updatedAt || payment.createdAt || now;
          hasChanges = true;
        }

        if (hasChanges) {
          await this.bkashPaymentRepository.save(payment);
          fixedCount++;
        }
      }

      return {
        message: `Fixed ${fixedCount} bKash payment records with null values`,
        fixedRecords: fixedCount,
        totalChecked: paymentsWithNulls.length,
      };
    } catch (error) {
      return {
        message: 'Error fixing bKash payment null values',
        error: error.message,
      };
    }
  }

  // Get payment analytics (includes both bKash and SSLCommerz)
  async getBkashPaymentAnalytics() {
    try {
      // bKash payments
      const [bkashTotal, bkashCompleted, bkashRefunded, bkashRefundsTotal] = await Promise.all([
        this.bkashPaymentRepository.count(),
        this.bkashPaymentRepository.count({ where: { status: 'Completed' } }),
        this.bkashPaymentRepository
          .createQueryBuilder('payment')
          .where('payment.refundAmount IS NOT NULL')
          .getCount(),
        this.bkashPaymentRepository
          .createQueryBuilder('payment')
          .select('SUM(payment.refundAmount)', 'total')
          .where('payment.refundAmount IS NOT NULL')
          .getRawOne(),
      ]);

      // SSLCommerz payments
      const [sslcommerzTotal, sslcommerzCompleted, sslcommerzRefunded, sslcommerzRefundsTotal] = await Promise.all([
        this.sslcommerzPaymentRepository.count(),
        this.sslcommerzPaymentRepository.count({ where: { status: 'VALID' } }),
        this.sslcommerzPaymentRepository
          .createQueryBuilder('payment')
          .where('payment.refundAmount IS NOT NULL')
          .getCount(),
        this.sslcommerzPaymentRepository
          .createQueryBuilder('payment')
          .select('SUM(payment.refundAmount)', 'total')
          .where('payment.refundAmount IS NOT NULL')
          .getRawOne(),
      ]);

      // Get recent payments from both gateways
      const bkashRecent = await this.bkashPaymentRepository.find({
        where: { status: 'Completed' },
        order: { paymentExecuteTime: 'DESC' },
        take: 5,
      });

      const sslcommerzRecent = await this.sslcommerzPaymentRepository.find({
        where: { status: 'VALID' },
        order: { validationTime: 'DESC' },
        take: 5,
      });

      // Calculate total revenue from both gateways
      let totalRevenue = 0;

      bkashRecent.forEach(payment => {
        const amount = Number(payment.amount);
        const refund = payment.refundAmount ? Number(payment.refundAmount) : 0;
        totalRevenue += (amount - refund);
      });

      sslcommerzRecent.forEach(payment => {
        const amount = Number(payment.amount);
        const refund = payment.refundAmount ? Number(payment.refundAmount) : 0;
        totalRevenue += (amount - refund);
      });

      return {
        totalPayments: bkashTotal + sslcommerzTotal,
        completedPayments: bkashCompleted + sslcommerzCompleted,
        refundedPayments: bkashRefunded + sslcommerzRefunded,
        totalRefundAmount: Number(bkashRefundsTotal?.total || 0) + Number(sslcommerzRefundsTotal?.total || 0),
        totalRevenue,
        bkashStats: {
          total: bkashTotal,
          completed: bkashCompleted,
          refunded: bkashRefunded,
        },
        sslcommerzStats: {
          total: sslcommerzTotal,
          completed: sslcommerzCompleted,
          refunded: sslcommerzRefunded,
        },
        recentPayments: [
          ...bkashRecent.map(payment => ({
            id: payment.id,
            paymentId: payment.paymentId,
            amount: payment.amount,
            status: payment.status,
            gateway: 'bKash',
            paymentTime: payment.paymentExecuteTime,
            merchantInvoiceNumber: payment.merchantInvoiceNumber,
            refundAmount: payment.refundAmount,
          })),
          ...sslcommerzRecent.map(payment => ({
            id: payment.id,
            paymentId: payment.tranId,
            amount: payment.amount,
            status: payment.status,
            gateway: 'SSLCommerz',
            paymentTime: payment.validationTime,
            merchantInvoiceNumber: payment.merchantInvoiceNumber,
            refundAmount: payment.refundAmount,
          })),
        ].sort((a, b) => {
          const timeA = a.paymentTime ? new Date(a.paymentTime).getTime() : 0;
          const timeB = b.paymentTime ? new Date(b.paymentTime).getTime() : 0;
          return timeB - timeA;
        }).slice(0, 10),
      };
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }

  // SMS Analytics Methods
  private async getSmsStatsForDashboard() {
    try {
      // Get total SMS balance across all organizations
      const totalBalanceResult = await this.smsBalanceRepository
        .createQueryBuilder('balance')
        .select('SUM(balance.balance)', 'totalBalance')
        .getRawOne();

      const totalBalance = parseInt(totalBalanceResult?.totalBalance || '0');

      // Determine global SMS status
      let status: 'healthy' | 'low' | 'critical' = 'healthy';
      if (totalBalance === 0) {
        status = 'critical';
      } else if (totalBalance <= 1000) {
        status = 'low';
      }

      // Get today's SMS count
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const todaySent = await this.smsLogRepository.count({
        where: {
          createdAt: MoreThanOrEqual(startOfDay),
          status: 'sent' as any,
        },
      });

      // Get this month's SMS count
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const monthlySent = await this.smsLogRepository.count({
        where: {
          createdAt: MoreThanOrEqual(startOfMonth),
          status: 'sent' as any,
        },
      });

      return {
        totalBalance,
        status,
        todaySent,
        monthlySent,
      };
    } catch (error) {
      return {
        totalBalance: 0,
        status: 'critical' as const,
        todaySent: 0,
        monthlySent: 0,
      };
    }
  }

  async getSmsGlobalStats() {
    try {
      // Get total organizations with SMS balance
      const totalOrganizations = await this.smsBalanceRepository.count();

      // Get total messages sent
      const totalMessagesSent = await this.smsLogRepository.count({
        where: { status: 'sent' as any },
      });

      // Get total SMS revenue
      const smsRevenueResult = await this.smsPackageRepository
        .createQueryBuilder('package')
        .select('SUM(package.totalAmount)', 'totalRevenue')
        .where('package.status = :status', { status: 'completed' })
        .getRawOne();
      const totalRevenue = parseFloat(smsRevenueResult?.totalRevenue || '0');

      // Get average price per SMS
      const averagePriceResult = await this.smsPackageRepository
        .createQueryBuilder('package')
        .select('AVG(package.pricePerSms)', 'avgPrice')
        .where('package.status = :status', { status: 'completed' })
        .getRawOne();
      const averagePricePerSms = parseFloat(averagePriceResult?.avgPrice || '0.5');

      // Count organizations with low and critical balance
      const organizationsWithLowBalance = await this.smsBalanceRepository.count({
        where: { balance: Between(11, 50) }, // Low balance: 11-50 SMS
      });
      
      const organizationsWithCriticalBalance = await this.smsBalanceRepository.count({
        where: { balance: LessThanOrEqual(10) }, // Critical balance: 0-10 SMS
      });

      // Get top organizations by SMS usage
      const topOrganizationsData = await this.smsBalanceRepository
        .createQueryBuilder('balance')
        .leftJoinAndSelect('balance.organization', 'organization')
        .select([
          'organization.id',
          'organization.name',
          'balance.totalUsed',
          'balance.totalSpent',
          'balance.balance'
        ])
        .orderBy('balance.totalSpent', 'DESC')
        .limit(10)
        .getMany();

      const topOrganizations = topOrganizationsData.map(balance => ({
        id: balance.organization?.id || 'unknown',
        name: balance.organization?.name || 'Unknown Organization',
        messagesSent: balance.totalUsed || 0,
        revenue: balance.totalSpent || 0,
        balance: balance.balance || 0,
        status: (balance.balance || 0) <= 10 ? 'critical' : 
                (balance.balance || 0) <= 50 ? 'low' : 'healthy' as 'healthy' | 'low' | 'critical'
      }));

      return {
        totalOrganizations,
        totalMessagesSent,
        totalRevenue,
        averagePricePerSms,
        organizationsWithLowBalance,
        organizationsWithCriticalBalance,
        topOrganizations,
      };
    } catch (error) {
      console.error('Error in getSmsGlobalStats:', error);
      return {
        totalOrganizations: 0,
        totalMessagesSent: 0,
        totalRevenue: 0,
        averagePricePerSms: 0.5,
        organizationsWithLowBalance: 0,
        organizationsWithCriticalBalance: 0,
        topOrganizations: [],
      };
    }
  }

  async getSmsAnalytics() {
    try {
      // Get total SMS packages sold
      const totalSmsPackagesSold = await this.smsPackageRepository.count({
        where: { status: SmsPackageStatus.COMPLETED },
      });

      // Get total SMS revenue
      const smsRevenueResult = await this.smsPackageRepository
        .createQueryBuilder('package')
        .select('SUM(package.totalAmount)', 'totalRevenue')
        .where('package.status = :status', { status: 'completed' })
        .getRawOne();

      const totalSmsRevenue = parseFloat(smsRevenueResult?.totalRevenue || '0');

      // Get total SMS sent
      const totalSmsSent = await this.smsLogRepository.count({
        where: { status: SmsStatus.SENT },
      });

      // Get monthly SMS revenue (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlySmsRevenue = await this.smsPackageRepository
        .createQueryBuilder('package')
        .select('TO_CHAR(package.createdAt, \'YYYY-MM\')', 'month')
        .addSelect('SUM(package.totalAmount)', 'revenue')
        .addSelect('SUM(package.smsCount)', 'smsCount')
        .where('package.status = :status', { status: 'completed' })
        .andWhere('package.createdAt >= :startDate', { startDate: twelveMonthsAgo })
        .groupBy('TO_CHAR(package.createdAt, \'YYYY-MM\')')
        .orderBy('month', 'ASC')
        .getRawMany();

      // Get top organizations by SMS spending
      const topSmsOrganizations = await this.smsBalanceRepository
        .createQueryBuilder('balance')
        .leftJoinAndSelect('balance.organization', 'organization')
        .select('organization.name', 'organizationName')
        .addSelect('balance.totalSpent', 'totalSpent')
        .addSelect('balance.totalUsed', 'smsUsed')
        .orderBy('balance.totalSpent', 'DESC')
        .limit(10)
        .getRawMany();

      return {
        totalSmsPackagesSold,
        totalSmsRevenue,
        totalSmsSent,
        monthlySmsRevenue: monthlySmsRevenue.map(item => ({
          month: item.month,
          revenue: parseFloat(item.revenue || '0'),
          smsCount: parseInt(item.smsCount || '0'),
        })),
        topSmsOrganizations: topSmsOrganizations.map(org => ({
          organizationName: org.organizationName || 'Unknown',
          totalSpent: parseFloat(org.totalSpent || '0'),
          smsUsed: parseInt(org.smsUsed || '0'),
        })),
      };
    } catch (error) {
      console.error('Error in getSmsAnalytics:', error);
      return {
        totalSmsPackagesSold: 0,
        totalSmsRevenue: 0,
        totalSmsSent: 0,
        monthlySmsRevenue: [],
        topSmsOrganizations: [],
      };
    }
  }

  async getPaymentStatistics() {
    try {
      // Get bKash payment statistics
      const bkashStats = await this.bkashPaymentRepository
        .createQueryBuilder('payment')
        .select('COUNT(*)', 'count')
        .addSelect('SUM(CASE WHEN payment.status = \'Completed\' THEN payment.amount ELSE 0 END)', 'completedAmount')
        .addSelect('SUM(CASE WHEN payment.status = \'Completed\' THEN 1 ELSE 0 END)', 'completedCount')
        .addSelect('SUM(CASE WHEN payment.status = \'Failed\' THEN 1 ELSE 0 END)', 'failedCount')
        .addSelect('SUM(CASE WHEN payment.refundAmount IS NOT NULL AND payment.refundAmount > 0 THEN 1 ELSE 0 END)', 'refundedCount')
        .getRawOne();

      // Get SSLCommerz payment statistics
      const sslStats = await this.sslcommerzPaymentRepository
        .createQueryBuilder('payment')
        .select('COUNT(*)', 'count')
        .addSelect('SUM(CASE WHEN payment.status = \'VALID\' THEN payment.amount ELSE 0 END)', 'completedAmount')
        .addSelect('SUM(CASE WHEN payment.status = \'VALID\' THEN 1 ELSE 0 END)', 'completedCount')
        .addSelect('SUM(CASE WHEN payment.status = \'FAILED\' THEN 1 ELSE 0 END)', 'failedCount')
        .addSelect('SUM(CASE WHEN payment.refundAmount IS NOT NULL AND payment.refundAmount > 0 THEN 1 ELSE 0 END)', 'refundedCount')
        .getRawOne();

      const totalPayments = parseInt(bkashStats.count || '0') + parseInt(sslStats.count || '0');
      const totalAmount = parseFloat(bkashStats.completedAmount || '0') + parseFloat(sslStats.completedAmount || '0');
      const successfulPayments = parseInt(bkashStats.completedCount || '0') + parseInt(sslStats.completedCount || '0');
      const failedPayments = parseInt(bkashStats.failedCount || '0') + parseInt(sslStats.failedCount || '0');
      const refundedPayments = parseInt(bkashStats.refundedCount || '0') + parseInt(sslStats.refundedCount || '0');

      return {
        totalPayments,
        totalAmount,
        successfulPayments,
        failedPayments,
        refundedPayments,
      };
    } catch (error) {
      console.error('Error getting payment statistics:', error);
      return {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        refundedPayments: 0,
      };
    }
  }

}

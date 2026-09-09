import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  Subscription,
  Organization,
  SubscriptionStatus,
  SubscriptionPlan,
  SubscriptionPlanEntity,
  BkashPayment,
  SslcommerzPayment,
} from '../entities';
import { EditSubscriptionDto } from './dto/edit-subscription.dto';
import { BkashService } from '../payments/bkash.service';
import { SslcommerzService } from '../payments/sslcommerz.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(SubscriptionPlanEntity)
    private planRepository: Repository<SubscriptionPlanEntity>,
    @InjectRepository(BkashPayment)
    private bkashPaymentRepository: Repository<BkashPayment>,
    @InjectRepository(SslcommerzPayment)
    private sslcommerzPaymentRepository: Repository<SslcommerzPayment>,
    private configService: ConfigService,
    private bkashService: BkashService,
    private sslcommerzService: SslcommerzService,
  ) {}

  async getSubscription(organizationId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { organization: { id: organizationId } },
      relations: ['organization'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async upgradeSubscription(
    organizationId: string,
    newPlanType: SubscriptionPlan,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(organizationId);
    const currentPlan = await this.planRepository.findOne({ where: { planType: subscription.plan } });
    const newPlan = await this.planRepository.findOne({ where: { planType: newPlanType } });

    if (!newPlan) {
      throw new NotFoundException('New subscription plan not found');
    }

    if (subscription.status === SubscriptionStatus.TRIAL) {
      // If on trial, can "upgrade" to any paid plan
      const result = await this.purchaseSubscription(organizationId, newPlanType, 'upgrade');
      // For trial upgrades, we need to create the subscription manually
      return this.confirmSubscriptionPayment(`sub_${organizationId}_${newPlanType}_${Date.now()}`);
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      if (!currentPlan) {
        throw new BadRequestException('Current subscription plan details not found');
      }
      if (newPlan.price <= currentPlan.price) {
        throw new BadRequestException('You can only upgrade to a more expensive subscription. Downgrades are only allowed after your current subscription period ends.');
      }
    }

    // Calculate new end date (30 days from now for simplicity)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    subscription.plan = newPlanType;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.endDate = endDate;
    subscription.nextPaymentDate = endDate;

    return this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(organizationId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(organizationId);

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.autoRenew = false;

    return this.subscriptionRepository.save(subscription);
  }

  async renewSubscription(organizationId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(organizationId);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Subscription is not active');
    }

    // Extend subscription by 30 days
    const newEndDate = new Date(subscription.endDate);
    newEndDate.setDate(newEndDate.getDate() + 30);

    subscription.endDate = newEndDate;
    subscription.nextPaymentDate = newEndDate;
    subscription.lastPaymentDate = new Date();

    return this.subscriptionRepository.save(subscription);
  }

  async isSubscriptionActive(organizationId: string): Promise<boolean> {
    try {
      const subscription = await this.getSubscription(organizationId);
      const now = new Date();

      return !!(
        (subscription.status === SubscriptionStatus.ACTIVE && subscription.endDate > now) ||
        (subscription.status === SubscriptionStatus.TRIAL && 
         subscription.trialEndDate && 
         subscription.trialEndDate > now)
      );
    } catch {
      return false;
    }
  }

async purchaseSubscription(
    organizationId: string,
    planType: SubscriptionPlan,
    payerReference: string,
    paymentMethod: 'bkash' | 'sslcommerz' = 'bkash',
  ): Promise<{ paymentUrl: string; paymentId?: string; merchantInvoiceNumber: string }> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['subscription'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const existingSubscription = organization.subscription;
    const now = new Date();

    // Defensive: treat missing endDate as expired
    const isExpired = existingSubscription && (!existingSubscription.endDate || existingSubscription.endDate < now);
    const isTrial = existingSubscription && existingSubscription.status === SubscriptionStatus.TRIAL;
    const isCancelled = existingSubscription && existingSubscription.status === SubscriptionStatus.CANCELLED;
    const isActiveAndNotExpired = existingSubscription && existingSubscription.status === SubscriptionStatus.ACTIVE && existingSubscription.endDate && existingSubscription.endDate >= now;

    if (isActiveAndNotExpired) {
      // Only allow upgrade to a more expensive plan
      const currentPlan = await this.planRepository.findOne({ where: { planType: existingSubscription.plan } });
      const newPlan = await this.planRepository.findOne({ where: { planType, isActive: true } });
      if (!newPlan) {
        throw new NotFoundException('Subscription plan not found or inactive');
      }
      // @ts-ignore
      if (newPlan.price <= currentPlan.price) {
        throw new BadRequestException('You can only upgrade to a more expensive subscription. Downgrades are only allowed after your current subscription period ends.');
      }
    } else if (!isTrial && !isCancelled && existingSubscription && !isExpired) {
      // Block purchase if not trial/cancelled/expired
      throw new BadRequestException('You can only upgrade to a more expensive subscription. Downgrades are only allowed after your current subscription period ends.');
    }

    const plan = await this.planRepository.findOne({
      where: { planType, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found or inactive');
    }

    // Create merchant invoice number that includes organization and plan info
    const merchantInvoiceNumber = `sub_${organization.id}_${planType}_${Date.now()}`;

    // Create payment based on selected payment method
    if (paymentMethod === 'sslcommerz') {
      // Use SSLCommerz payment
      const sslcommerzData = {
        total_amount: Math.max(Number(plan.price), 10), // SSLCommerz minimum is 10 BDT
        currency: 'BDT',
        tran_id: merchantInvoiceNumber,
        product_name: `${planType} Subscription`,
        product_category: 'Subscription',
        cus_name: organization.name || 'Customer',
        cus_email: payerReference || 'customer@example.com',
        cus_phone: organization.phone || '01711111111',
        cus_add1: organization.address || 'Dhaka',
        cus_city: organization.city || 'Dhaka',
        cus_state: organization.state || 'Dhaka',
        cus_postcode: organization.postalCode || '1000',
        cus_country: organization.country || 'Bangladesh',
        shipping_method: 'NO',
        product_profile: 'non-physical-goods',
      };

      const sslcommerzResponse = await this.sslcommerzService.initiatePayment(sslcommerzData);

      // Link payment to organization
      await this.sslcommerzService.linkPaymentToSubscription(
        merchantInvoiceNumber,
        organization.id,
      );

      return {
        paymentUrl: sslcommerzResponse.GatewayPageURL || '',
        merchantInvoiceNumber,
      };
    } else {
      // Use bKash payment (default)
      const paymentData = {
        mode: '0011' as const,
        payerReference,
        callbackURL: this.configService.get<string>('BKASH_CALLBACK_URL') || '',
        amount: Math.max(Number(plan.price), 1).toFixed(2), // Ensure minimum 1 BDT
        currency: 'BDT' as const,
        intent: 'sale' as const,
        merchantInvoiceNumber
      };

      const paymentResponse = await this.bkashService.createPayment(paymentData);

      // Return payment URL without creating subscription
      // Subscription will be created only after successful payment in confirmSubscriptionPayment
      return {
        paymentUrl: paymentResponse.bkashURL,
        paymentId: paymentResponse.paymentID,
        merchantInvoiceNumber
      };
    }
  }

  /**
   * Create subscription after successful payment confirmation
   */
  async confirmSubscriptionPayment(
    merchantInvoiceNumber: string
  ): Promise<Subscription> {
    // Extract organization ID and plan type from merchant invoice number
    const parts = merchantInvoiceNumber.split('_');
    if (parts.length < 3 || parts[0] !== 'sub') {
      throw new BadRequestException('Invalid merchant invoice number format');
    }

    const organizationId = parts[1];
    const planType = parts[2] as SubscriptionPlan;

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['subscription'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const plan = await this.planRepository.findOne({
      where: { planType, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found or inactive');
    }

    const existingSubscription = organization.subscription;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationDays);

    let subscription: Subscription;

    if (existingSubscription) {
      subscription = existingSubscription;
    } else {
      subscription = new Subscription();
      subscription.organization = organization;
    }

    subscription.plan = planType;
    subscription.status = planType === SubscriptionPlan.TRIAL ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;
    subscription.startDate = startDate;
    subscription.endDate = endDate;
    subscription.trialEndDate = planType === SubscriptionPlan.TRIAL ? endDate : null;
    subscription.autoRenew = Number(plan.price) > 0;
    subscription.nextPaymentDate = Number(plan.price) > 0 ? endDate : null;
    subscription.lastPaymentDate = new Date();
    subscription.hasUsedTrial = planType === SubscriptionPlan.TRIAL || (existingSubscription?.hasUsedTrial ?? false);

    const savedSubscription = await this.subscriptionRepository.save(subscription);
    
    // Try to link the payment to this subscription
    try {
      const payment = await this.bkashService.getPaymentByInvoiceNumber(merchantInvoiceNumber);
      if (payment) {
        await this.bkashService.linkPaymentToSubscription(
          payment.paymentId, 
          organizationId, 
          savedSubscription.id
        );
      }
    } catch (error) {
      // Silent error - payment linking is not critical
    }
    
    return savedSubscription;
  }

  // Get available plans for purchase
  async getAvailablePlans(): Promise<SubscriptionPlanEntity[]> {
    return this.planRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Debug method to get all plans with details
   */
  async debugGetAllPlans(): Promise<any> {
    const plans = await this.planRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return {
      total: plans.length,
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        planType: plan.planType,
        price: plan.price,
        priceType: typeof plan.price,
        currency: plan.currency,
        isActive: plan.isActive,
        createdAt: plan.createdAt,
      })),
    };
  }

  // Edit subscription details
  async editSubscription(
    organizationId: string,
    editSubscriptionDto: EditSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(organizationId);

    // Update subscription fields if provided
    if (editSubscriptionDto.plan) {
      const newPlan = await this.planRepository.findOne({ 
        where: { planType: editSubscriptionDto.plan, isActive: true } 
      });
      if (!newPlan) {
        throw new NotFoundException('Subscription plan not found or inactive');
      }
      subscription.plan = editSubscriptionDto.plan;
    }

    if (editSubscriptionDto.status) {
      subscription.status = editSubscriptionDto.status;
    }

    if (editSubscriptionDto.expiresAt) {
      subscription.endDate = new Date(editSubscriptionDto.expiresAt);
    }

    return this.subscriptionRepository.save(subscription);
  }

  // Delete/Cancel subscription
  async deleteSubscription(
    organizationId: string,
    subscriptionId?: string,
  ): Promise<{ message: string }> {
    const subscription = await this.getSubscription(organizationId);

    // If specific subscription ID is provided, verify it matches
    if (subscriptionId && subscription.id !== subscriptionId) {
      throw new NotFoundException('Subscription not found for this organization');
    }

    // Instead of hard delete, mark as cancelled
    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.autoRenew = false;
    
    await this.subscriptionRepository.save(subscription);
    
    return { message: 'Subscription cancelled successfully' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    
    // Find expired subscriptions
    const expiredSubscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.endDate < :now', { now })
      .andWhere('subscription.status IN (:...statuses)', { 
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] 
      })
      .getMany();

    // Update status to expired
    for (const subscription of expiredSubscriptions) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(subscription);
    }

  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async sendExpirationWarnings(): Promise<void> {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 3); // 3 days before expiration

    const expiringSubscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.organization', 'organization')
      .where('subscription.endDate <= :warningDate', { warningDate })
      .andWhere('subscription.endDate > :now', { now: new Date() })
      .andWhere('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .getMany();

    // Here you would send warning emails to organization owners
  }

  // Get payment history for an organization
  async getPaymentHistory(organizationId: string): Promise<any[]> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Fetch bKash payments
    const bkashPayments = await this.bkashPaymentRepository.find({
      where: { organization: { id: organizationId } },
      relations: ['subscription'],
      order: { createdAt: 'DESC' },
    });

    // Fetch SSLCommerz payments
    const sslcommerzPayments = await this.sslcommerzPaymentRepository.find({
      where: { organization: { id: organizationId } },
      relations: ['subscription'],
      order: { createdAt: 'DESC' },
    });

    // Format and combine payments
    const formattedBkashPayments = bkashPayments
      .filter(p => p.merchantInvoiceNumber?.startsWith('sub_') && p.status === 'COMPLETED')
      .map(payment => ({
        id: payment.id,
        paymentId: payment.paymentId,
        invoiceNumber: payment.merchantInvoiceNumber,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        paymentMethod: 'bKash',
        transactionId: payment.trxId,
        paymentDate: payment.paymentExecuteTime || payment.createdAt,
        createdAt: payment.createdAt,
      }));

    const formattedSslcommerzPayments = sslcommerzPayments
      .filter(p => p.merchantInvoiceNumber?.startsWith('sub_') && p.status === 'VALID')
      .map(payment => ({
        id: payment.id,
        paymentId: payment.tranId,
        invoiceNumber: payment.merchantInvoiceNumber,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        paymentMethod: 'SSLCommerz',
        transactionId: payment.bankTranId,
        cardType: payment.cardType,
        paymentDate: payment.tranDate || payment.createdAt,
        createdAt: payment.createdAt,
      }));

    // Combine and sort by date
    const allPayments = [...formattedBkashPayments, ...formattedSslcommerzPayments];
    allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    return allPayments;
  }

  // Get invoice data for a specific payment
  async getInvoiceData(organizationId: string, paymentId: string): Promise<any> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['subscription'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Try to find in bKash payments
    let payment: any = await this.bkashPaymentRepository.findOne({
      where: { id: paymentId, organization: { id: organizationId } },
      relations: ['subscription', 'organization'],
    });

    let paymentMethod = 'bKash';
    
    // If not found, try SSLCommerz
    if (!payment) {
      payment = await this.sslcommerzPaymentRepository.findOne({
        where: { id: paymentId, organization: { id: organizationId } },
        relations: ['subscription', 'organization'],
      });
      paymentMethod = 'SSLCommerz';
    }

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Get plan details
    const planType = payment.subscription?.plan || SubscriptionPlan.BASIC;
    const planDetails = await this.planRepository.findOne({
      where: { planType },
    });

    // Format invoice data
    const invoiceData = {
      invoiceNumber: payment.merchantInvoiceNumber || payment.paymentId || payment.tranId,
      paymentId: payment.paymentId || payment.tranId,
      transactionId: payment.trxId || payment.bankTranId,
      paymentMethod,
      paymentDate: payment.paymentExecuteTime || payment.tranDate || payment.createdAt,
      amount: Number(payment.amount),
      currency: payment.currency || 'BDT',
      status: payment.status,
      organization: {
        name: organization.name,
        phone: organization.phone,
        address: organization.address,
        city: organization.city,
        country: organization.country,
      },
      subscription: {
        plan: planType,
        planName: planDetails?.name || planType,
        features: planDetails?.features || [],
      },
      cardType: payment.cardType,
    };

    return invoiceData;
  }
}

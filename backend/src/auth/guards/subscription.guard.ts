import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../../entities';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.organizationId) {
      throw new ForbiddenException('User or organization not found');
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { organization: { id: user.organizationId } },
      relations: ['organization'],
    });

    if (!subscription) {
      throw new ForbiddenException('No subscription found');
    }

    const now = new Date();
    
    // Check if subscription is active or in trial
    if (subscription.status === SubscriptionStatus.ACTIVE && subscription.endDate > now) {
      return true;
    }
    
    if (subscription.status === SubscriptionStatus.TRIAL && subscription.trialEndDate && subscription.trialEndDate > now) {
      return true;
    }

    throw new ForbiddenException('Subscription expired or inactive');
  }
}

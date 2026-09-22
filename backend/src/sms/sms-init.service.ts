import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsSettings } from '../entities';

@Injectable()
export class SmsInitService implements OnModuleInit {
  constructor(
    @InjectRepository(SmsSettings)
    private smsSettingsRepository: Repository<SmsSettings>,
  ) {}

  async onModuleInit() {
    await this.initializeSmsSettings();
  }

  private async initializeSmsSettings() {
    try {
      const existingSettings = await this.smsSettingsRepository.findOne({ where: {} });
      
      if (!existingSettings) {
        const defaultSettings = this.smsSettingsRepository.create({
          pricePerSms: 0.50,
          minimumPurchase: 100,
          isEnabled: true,
          defaultGateway: 'default',
          defaultSenderId: 'INVENTORY',
          dailyLimit: 1000,
          rateLimitPerMinute: 100,
          enableDeliveryReports: true,
          honorOptOutRequests: true,
          sendingStartTime: '09:00:00',
          sendingEndTime: '21:00:00',
          restrictSendingHours: false,
        });

        await this.smsSettingsRepository.save(defaultSettings);
        console.log('✅ SMS settings initialized with default values');
      }
    } catch (error) {
      console.error('❌ Failed to initialize SMS settings:', error);
    }
  }
}

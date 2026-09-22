import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  SmsBalance,
  SmsPackage,
  SmsPackageStatus,
  SmsLog,
  SmsType,
  SmsStatus,
  SmsSettings,
  Expense,
  ExpenseCategory,
  Organization,
} from '../entities';
import { PurchaseSmsDto, SendSmsDto, PurchaseType } from './dto/sms.dto';
import { BkashService } from '../payments/bkash.service';
import { SslcommerzService } from '../payments/sslcommerz.service';

@Injectable()
export class SmsService {
  constructor(
    @InjectRepository(SmsBalance)
    private smsBalanceRepository: Repository<SmsBalance>,
    @InjectRepository(SmsPackage)
    private smsPackageRepository: Repository<SmsPackage>,
    @InjectRepository(SmsLog)
    private smsLogRepository: Repository<SmsLog>,
    @InjectRepository(SmsSettings)
    private smsSettingsRepository: Repository<SmsSettings>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private bkashService: BkashService,
    private sslcommerzService: SslcommerzService,
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  // SMS Settings (for public access)
  async getSmsSettings(): Promise<SmsSettings> {
    let settings = await this.smsSettingsRepository.findOne({ where: {} });
    
    if (!settings) {
      settings = this.smsSettingsRepository.create({
        pricePerSms: 0.50,
        minimumPurchase: 100,
        isEnabled: true,
        defaultGateway: 'default',
        defaultSenderId: 'INVENTORY',
      });
      await this.smsSettingsRepository.save(settings);
    }
    
    return settings;
  }

  // SMS Balance Management
  async getSmsBalance(organizationId: string): Promise<SmsBalance> {
    let balance = await this.smsBalanceRepository.findOne({
      where: { organizationId },
      relations: ['organization'],
    });

    if (!balance) {
      balance = this.smsBalanceRepository.create({
        organizationId,
        balance: 0,
        totalPurchased: 0,
        totalUsed: 0,
        totalSpent: 0,
      });
      await this.smsBalanceRepository.save(balance);
    }

    return balance;
  }

  async getBalanceStatus(organizationId: string): Promise<{
    balance: number;
    status: 'healthy' | 'low' | 'critical';
    message: string;
  }> {
    const smsBalance = await this.getSmsBalance(organizationId);
    
    let status: 'healthy' | 'low' | 'critical' = 'healthy';
    let message = 'SMS balance is healthy';

    if (smsBalance.balance === 0) {
      status = 'critical';
      message = 'No SMS balance remaining. Purchase SMS to continue sending messages.';
    } else if (smsBalance.balance <= 50) {
      status = 'critical';
      message = 'Critical: SMS balance is very low. Recharge immediately.';
    } else if (smsBalance.balance <= 200) {
      status = 'low';
      message = 'Warning: SMS balance is running low. Consider purchasing more SMS.';
    }

    return {
      balance: smsBalance.balance,
      status,
      message,
    };
  }

  // SMS Purchase
  async initiatePurchase(organizationId: string, purchaseData: PurchaseSmsDto, paymentMethod: 'bkash' | 'sslcommerz' = 'bkash'): Promise<{
    packageId: string;
    smsCount: number;
    totalAmount: number;
    pricePerSms: number;
    bkashPaymentUrl?: string;
    sslcommerzPaymentUrl?: string;
  }> {
    const settings = await this.getSmsSettings();
    
    if (!settings.isEnabled) {
      throw new ForbiddenException('SMS service is currently disabled');
    }

    let smsCount: number;
    let totalAmount: number;

    if (purchaseData.type === PurchaseType.BY_COUNT) {
      if (!purchaseData.smsCount || purchaseData.smsCount < settings.minimumPurchase) {
        throw new BadRequestException(`Minimum purchase is ${settings.minimumPurchase} SMS`);
      }
      smsCount = purchaseData.smsCount;
      totalAmount = smsCount * settings.pricePerSms;
    } else {
      if (!purchaseData.amount || purchaseData.amount < settings.minimumPurchase * settings.pricePerSms) {
        throw new BadRequestException(`Minimum purchase amount is ৳${(settings.minimumPurchase * settings.pricePerSms).toFixed(2)}`);
      }
      totalAmount = purchaseData.amount;
      smsCount = Math.floor(totalAmount / settings.pricePerSms);
    }

    // Generate unique package number
    const packageNumber = `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create SMS package record
    const smsPackage = this.smsPackageRepository.create({
      packageNumber,
      smsCount,
      totalAmount,
      pricePerSms: settings.pricePerSms,
      organizationId,
      notes: purchaseData.notes,
    });

    await this.smsPackageRepository.save(smsPackage);

    // Initiate payment based on selected method
    try {
      if (paymentMethod === 'sslcommerz') {
        // Get organization details for SSLCommerz
        const organization = await this.organizationRepository.findOne({
          where: { id: organizationId },
        });

        if (!organization) {
          throw new BadRequestException('Organization not found');
        }

        // Initiate SSLCommerz payment
        const sslcommerzPayment = await this.sslcommerzService.initiatePayment({
          total_amount: totalAmount,
          currency: 'BDT',
          tran_id: packageNumber,
          product_name: `SMS Package - ${smsCount} SMS`,
          product_category: 'SMS',
          cus_name: organization.name || 'Customer',
          cus_email: 'customer@example.com', // Default email
          cus_phone: organization.phone || '01711111111',
          cus_add1: organization.address || 'Dhaka',
          cus_city: organization.city || 'Dhaka',
          cus_state: organization.state || 'Dhaka',
          cus_postcode: organization.postalCode || '1000',
          cus_country: organization.country || 'Bangladesh',
          shipping_method: 'NO',
          product_profile: 'non-physical-goods',
        });

        // Link SSLCommerz payment to SMS package
        const savedSslcommerzPayment = await this.sslcommerzService.getPaymentByTransactionId(packageNumber);
        if (savedSslcommerzPayment) {
          smsPackage.sslcommerzPaymentId = savedSslcommerzPayment.id;
          await this.smsPackageRepository.save(smsPackage);
        }

        // Link SSLCommerz payment to organization
        await this.sslcommerzService.linkPaymentToSubscription(packageNumber, organizationId);

        return {
          packageId: smsPackage.id,
          smsCount,
          totalAmount,
          pricePerSms: settings.pricePerSms,
          sslcommerzPaymentUrl: sslcommerzPayment.GatewayPageURL,
        };
      } else {
        // Use bKash payment (default)
        const bkashPayment = await this.bkashService.createPayment({
          mode: '0011',
          payerReference: packageNumber,
          callbackURL: this.configService.get('BKASH_CALLBACK_URL') || 'http://localhost:5000/payments/bkash/callback',
          amount: totalAmount.toFixed(2),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: packageNumber,
        });

        // Link bKash payment to SMS package
        const savedBkashPayment = await this.bkashService.getPaymentById(bkashPayment.paymentID);
        if (savedBkashPayment) {
          smsPackage.bkashPaymentId = savedBkashPayment.id;
          await this.smsPackageRepository.save(smsPackage);
        }

        // Link bKash payment to organization
        await this.bkashService.linkPaymentToSubscription(bkashPayment.paymentID, organizationId);

        return {
          packageId: smsPackage.id,
          smsCount,
          totalAmount,
          pricePerSms: settings.pricePerSms,
          bkashPaymentUrl: bkashPayment.bkashURL,
        };
      }
    } catch (error) {
      // Delete the SMS package if bKash payment creation fails
      await this.smsPackageRepository.delete(smsPackage.id);
      throw new BadRequestException(`Failed to initiate payment: ${error.message}`);
    }
  }

  async completePurchase(packageId: string, paymentId: string): Promise<{
    success: boolean;
    smsAdded: number;
    newBalance: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const smsPackage = await queryRunner.manager.findOne(SmsPackage, {
        where: { id: packageId },
      });

      if (!smsPackage) {
        throw new NotFoundException('SMS package not found');
      }

      // Verify payment with bKash
      const paymentStatus = await this.bkashService.queryPayment(paymentId);
      
      if (paymentStatus.transactionStatus !== 'Completed') {
        throw new BadRequestException('Payment not completed');
      }

      // Update SMS package status
      smsPackage.status = SmsPackageStatus.COMPLETED;
      await queryRunner.manager.save(smsPackage);

      // Update SMS balance
      const smsBalance = await this.getSmsBalance(smsPackage.organizationId);
      smsBalance.balance += smsPackage.smsCount;
      smsBalance.totalPurchased += smsPackage.smsCount;
      smsBalance.totalSpent += smsPackage.totalAmount;
      await queryRunner.manager.save(smsBalance);

      // Record expense
      const organization = await this.organizationRepository.findOne({
        where: { id: smsPackage.organizationId },
      });

      if (organization) {
        const expense = this.expenseRepository.create({
          title: `SMS Purchase - ${smsPackage.smsCount} SMS`,
          description: `SMS Package: ${smsPackage.packageNumber}`,
          amount: smsPackage.totalAmount,
          category: ExpenseCategory.SMS,
          expenseDate: new Date(),
          paymentMethod: 'bkash',
          reference: paymentId,
          notes: `SMS Package: ${smsPackage.packageNumber}`,
          organizationId: organization.id,
        });
        await queryRunner.manager.save(expense);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        smsAdded: smsPackage.smsCount,
        newBalance: smsBalance.balance,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // SMS Sending
  async sendSms(organizationId: string, smsData: SendSmsDto): Promise<{
    success: boolean;
    messageId: string;
    cost: number;
    remainingBalance: number;
  }> {
    const settings = await this.getSmsSettings();
    
    if (!settings.isEnabled) {
      throw new ForbiddenException('SMS service is currently disabled');
    }

    // Check SMS balance
    const smsBalance = await this.getSmsBalance(organizationId);
    
    if (smsBalance.balance <= 0) {
      throw new BadRequestException('Insufficient SMS balance. Please purchase SMS first.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Send SMS via gateway
      const gatewayResponse = await this.sendViaGateway(smsData);
      
      // Create SMS log
      const smsLog = this.smsLogRepository.create({
        recipient: smsData.recipient,
        recipientName: smsData.recipientName,
        message: smsData.message,
        type: Object.values(SmsType).includes(smsData.type as SmsType) 
          ? (smsData.type as SmsType) 
          : SmsType.TRANSACTIONAL,
        status: gatewayResponse.success ? SmsStatus.SENT : SmsStatus.FAILED,
        cost: settings.pricePerSms,
        gateway: smsData.gateway || settings.defaultGateway,
        gatewayResponse: JSON.stringify(gatewayResponse),
        organizationId,
      });

      if (gatewayResponse.success) {
        smsLog.deliveryReportId = gatewayResponse.messageId;
      } else {
        smsLog.failureReason = gatewayResponse.error;
      }

      await queryRunner.manager.save(smsLog);

      // Update SMS balance if SMS was sent successfully
      if (gatewayResponse.success) {
        smsBalance.balance -= 1;
        smsBalance.totalUsed += 1;
        await queryRunner.manager.save(smsBalance);
      }

      await queryRunner.commitTransaction();

      return {
        success: gatewayResponse.success,
        messageId: smsLog.id,
        cost: settings.pricePerSms,
        remainingBalance: smsBalance.balance,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // SMS Gateway Integration - BulkSMS BD
  private async sendViaGateway(smsData: SendSmsDto): Promise<any> {
    try {
      const apiKey = this.configService.get('SMS_API_KEY');
      const senderId = this.configService.get('SMS_SENDER_ID');
      const baseUrl = this.configService.get('SMS_BASE_URL');

      if (!apiKey || !senderId || !baseUrl) {
        throw new Error('SMS gateway configuration is missing');
      }

      // Format phone number (ensure it starts with 88 for Bangladesh)
      let phoneNumber = smsData.recipient.replace(/\D/g, '');
      if (phoneNumber.startsWith('01')) {
        phoneNumber = '88' + phoneNumber;
      } else if (!phoneNumber.startsWith('88')) {
        phoneNumber = '88' + phoneNumber;
      }

      // URL encode the message to handle special characters
      const encodedMessage = encodeURIComponent(smsData.message);

      // Construct the API URL
      const apiUrl = `${baseUrl}/smsapi?api_key=${apiKey}&type=text&number=${phoneNumber}&senderid=${senderId}&message=${encodedMessage}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.text();
      
      // Try to parse as JSON first, fallback to text
      let parsedResult;
      try {
        parsedResult = JSON.parse(result);
      } catch {
        parsedResult = result.trim();
      }

      // Handle JSON response format
      if (typeof parsedResult === 'object' && parsedResult.response_code !== undefined) {
        const responseCode = parsedResult.response_code.toString();
        
        if (responseCode === '202') {
          return {
            success: true,
            messageId: `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            gatewayResponse: result,
          };
        } else {
          // Map error codes to human-readable messages
          const errorMessages: Record<string, string> = {
            '1001': 'Invalid Number',
            '1002': 'Sender id not correct/sender id is disabled',
            '1003': 'Please Required all fields/Contact Your System Administrator',
            '1005': 'Internal Error',
            '1006': 'Balance Validity Not Available',
            '1007': 'Balance Insufficient',
            '1011': 'User Id not found',
            '1012': 'Masking SMS must be sent in Bengali',
            '1013': 'Sender Id has not found Gateway by api key',
            '1014': 'Sender Type Name not found using this sender by api key',
            '1015': 'Sender Id has not found Any Valid Gateway by api key',
            '1016': 'Sender Type Name Active Price Info not found by this sender id',
            '1017': 'Sender Type Name Price Info not found by this sender id',
            '1018': 'The Owner of this (username) Account is disabled',
            '1019': 'The (sender type name) Price of this (username) Account is disabled',
            '1020': 'The parent of this account is not found',
            '1021': 'The parent active (sender type name) price of this account is not found',
            '1031': 'Your Account Not Verified, Please Contact Administrator',
            '1032': 'IP Not whitelisted',
          };

          const errorMessage = errorMessages[responseCode] || parsedResult.error_message || `Unknown error: ${result}`;
          
          return {
            success: false,
            error: errorMessage,
            gatewayResponse: result,
          };
        }
      } else {
        // Handle text response format (legacy)
        const resultCode = parsedResult.toString();
        
        if (resultCode === '202') {
          return {
            success: true,
            messageId: `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            gatewayResponse: result,
          };
        } else {
          const errorMessages: Record<string, string> = {
            '1001': 'Invalid Number',
            '1002': 'Sender id not correct/sender id is disabled',
            '1003': 'Please Required all fields/Contact Your System Administrator',
            '1005': 'Internal Error',
            '1006': 'Balance Validity Not Available',
            '1007': 'Balance Insufficient',
            '1011': 'User Id not found',
            '1012': 'Masking SMS must be sent in Bengali',
            '1013': 'Sender Id has not found Gateway by api key',
            '1014': 'Sender Type Name not found using this sender by api key',
            '1015': 'Sender Id has not found Any Valid Gateway by api key',
            '1016': 'Sender Type Name Active Price Info not found by this sender id',
            '1017': 'Sender Type Name Price Info not found by this sender id',
            '1018': 'The Owner of this (username) Account is disabled',
            '1019': 'The (sender type name) Price of this (username) Account is disabled',
            '1020': 'The parent of this account is not found',
            '1021': 'The parent active (sender type name) price of this account is not found',
            '1031': 'Your Account Not Verified, Please Contact Administrator',
            '1032': 'IP Not whitelisted',
          };

          const errorMessage = errorMessages[resultCode] || `Unknown error: ${result}`;
          
          return {
            success: false,
            error: errorMessage,
            gatewayResponse: result,
          };
        }
      }
    } catch (error) {
      console.error('SMS Gateway Error:', error);
      return {
        success: false,
        error: error.message || 'SMS gateway connection failed',
        gatewayResponse: null,
      };
    }
  }

  // Check SMS Gateway Balance
  private async checkGatewayBalance(): Promise<{ balance: number; error?: string }> {
    try {
      const apiKey = this.configService.get('SMS_API_KEY');
      const baseUrl = this.configService.get('SMS_BASE_URL');

      if (!apiKey || !baseUrl) {
        return { balance: 0, error: 'SMS gateway configuration is missing' };
      }

      const apiUrl = `${baseUrl}/getBalanceApi?api_key=${apiKey}`;      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, application/json',
        },
      });

      if (!response.ok) {
        return { 
          balance: 0, 
          error: `API returned error: ${response.status} ${response.statusText}` 
        };
      }

      const result = await response.text();

      // Try to parse as JSON first
      try {
        const jsonResult = JSON.parse(result);
        if (jsonResult.balance !== undefined) {
          const balance = parseFloat(jsonResult.balance) || 0;
          return { balance };
        } else if (jsonResult.error) {
          return { balance: 0, error: jsonResult.error };
        }
      } catch {
        // Not JSON, try parsing as plain number
      }

      // Parse as plain text/number
      const balance = parseFloat(result.trim()) || 0;
      if (isNaN(balance)) {
        return { balance: 0, error: 'Invalid response from gateway' };
      }

      return { balance };
    } catch (error) {
      return { balance: 0, error: error.message || 'Failed to connect to SMS gateway' };
    }
  }

  // SMS Usage Statistics
  async getSmsUsageStats(organizationId: string): Promise<{
    todaySent: number;
    monthlySent: number;
    totalSent: number;
    balance: number;
  }> {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayResult, monthlyResult, totalResult, balance] = await Promise.all([
      // Count SMS sent today
      this.smsLogRepository
        .createQueryBuilder('sms')
        .where('sms.organizationId = :organizationId', { organizationId })
        .andWhere('sms.status = :status', { status: SmsStatus.SENT })
        .andWhere('sms.createdAt >= :startOfToday', { startOfToday })
        .getCount(),
      // Count SMS sent this month
      this.smsLogRepository
        .createQueryBuilder('sms')
        .where('sms.organizationId = :organizationId', { organizationId })
        .andWhere('sms.status = :status', { status: SmsStatus.SENT })
        .andWhere('sms.createdAt >= :startOfMonth', { startOfMonth })
        .getCount(),
      // Count total SMS sent
      this.smsLogRepository.count({
        where: {
          organizationId,
          status: SmsStatus.SENT,
        },
      }),
      // Get current balance
      this.getSmsBalance(organizationId),
    ]);

    return {
      todaySent: todayResult,
      monthlySent: monthlyResult,
      totalSent: totalResult,
      balance: balance.balance,
    };
  }

  // Public SMS settings (for users to see pricing)
  async getPublicSmsSettings(): Promise<{
    pricePerSms: number;
    minimumPurchase: number;
    maximumPurchase: number;
    isEnabled: boolean;
  }> {
    const settings = await this.getSmsSettings();
    
    return {
      pricePerSms: settings.pricePerSms,
      minimumPurchase: settings.minimumPurchase,
      maximumPurchase: settings.maximumPurchase || 10000,
      isEnabled: settings.isEnabled,
    };
  }

  async confirmSmsPayment(paymentId: string, paymentMethod: 'bkash' | 'sslcommerz' = 'bkash'): Promise<void> {
    try {
      let smsPackage: SmsPackage | null = null;

      if (paymentMethod === 'sslcommerz') {
        // For SSLCommerz, paymentId is the UUID from sslcommerz_payments table
        // Get the SMS package by SSLCommerz payment UUID
        smsPackage = await this.smsPackageRepository.findOne({
          where: { sslcommerzPaymentId: paymentId },
          relations: ['organization'],
        });

        if (!smsPackage) {
          throw new Error(`SMS package not found for SSLCommerz payment ID: ${paymentId}`);
        }
      } else {
        // Get the bKash payment record first
        const bkashPayment = await this.bkashService.getPaymentById(paymentId);
        if (!bkashPayment) {
          throw new Error(`bKash payment not found: ${paymentId}`);
        }

        // Get the SMS package by bKash payment ID
        smsPackage = await this.smsPackageRepository.findOne({
          where: { bkashPaymentId: bkashPayment.id },
          relations: ['organization'],
        });

        if (!smsPackage) {
          throw new Error(`SMS package not found for bKash payment ID: ${paymentId}`);
        }
      }

      if (smsPackage.status === SmsPackageStatus.COMPLETED) {
        // Already processed
        return;
      }

      // Mark package as completed
      smsPackage.status = SmsPackageStatus.COMPLETED;
      await this.smsPackageRepository.save(smsPackage);

      // Add SMS balance to organization
      let smsBalance = await this.smsBalanceRepository.findOne({
        where: { organizationId: smsPackage.organizationId },
      });

      if (!smsBalance) {
        smsBalance = this.smsBalanceRepository.create({
          organizationId: smsPackage.organizationId,
          balance: 0,
        });
      }

      smsBalance.balance += smsPackage.smsCount;
      await this.smsBalanceRepository.save(smsBalance);

      console.log(`SMS payment confirmed via ${paymentMethod}: Added ${smsPackage.smsCount} SMS to organization ${smsPackage.organizationId}`);
    } catch (error) {
      console.error('Error confirming SMS payment:', error);
      throw error;
    }
  }

  // Admin method to check SMS Gateway balance
  async getGatewayBalance(): Promise<{ balance: number; error?: string }> {
    return this.checkGatewayBalance();
  }

  // Admin method to update SMS settings
  async updateSmsSettings(settingsData: Partial<SmsSettings>): Promise<SmsSettings> {
    let settings = await this.smsSettingsRepository.findOne({ where: {} });
    
    if (!settings) {
      // Create new settings if none exist
      settings = this.smsSettingsRepository.create({
        pricePerSms: 0.50,
        minimumPurchase: 100,
        isEnabled: true,
        defaultGateway: 'default',
        defaultSenderId: 'INVENTORY',
      });
    }

    // Update with provided data
    Object.assign(settings, settingsData);
    
    return this.smsSettingsRepository.save(settings);
  }
}

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SslcommerzPayment } from '../entities/sslcommerz-payment.entity';

const SSLCommerzPayment = require('sslcommerz-lts');

export interface SslcommerzInitRequest {
  total_amount: number;
  currency: string;
  tran_id: string;
  product_name: string;
  product_category: string;
  cus_name: string;
  cus_email: string;
  cus_add1: string;
  cus_city: string;
  cus_state: string;
  cus_postcode: string;
  cus_country: string;
  cus_phone: string;
  shipping_method?: string;
  product_profile?: string;
  cus_add2?: string;
  cus_fax?: string;
  ship_name?: string;
  ship_add1?: string;
  ship_add2?: string;
  ship_city?: string;
  ship_state?: string;
  ship_postcode?: string;
  ship_country?: string;
}

export interface SslcommerzInitResponse {
  status: string;
  failedreason?: string;
  sessionkey?: string;
  gw?: any;
  redirectGatewayURL?: string;
  directPaymentURLBank?: string;
  directPaymentURLCard?: string;
  directPaymentURL?: string;
  redirectGatewayURLFailed?: string;
  GatewayPageURL?: string;
  storeBanner?: string;
  storeLogo?: string;
  desc?: any[];
  is_direct_pay_enable?: string;
}

export interface SslcommerzValidationResponse {
  status: string;
  tran_date: string;
  tran_id: string;
  val_id: string;
  amount: string;
  store_amount: string;
  currency: string;
  bank_tran_id: string;
  card_type: string;
  card_no: string;
  card_issuer: string;
  card_brand: string;
  card_issuer_country: string;
  card_issuer_country_code: string;
  currency_type: string;
  currency_amount: string;
  currency_rate: string;
  base_fair: string;
  value_a?: string;
  value_b?: string;
  value_c?: string;
  value_d?: string;
  risk_level: string;
  risk_title: string;
  error?: string;
  APIConnect?: any;
  validated_on?: string;
  gw_version?: string;
}

export interface SslcommerzRefundRequest {
  refund_amount: number;
  refund_remarks: string;
  bank_tran_id: string;
  refe_id: string;
}

export interface SslcommerzRefundResponse {
  APIConnect: string;
  bank_tran_id: string;
  trans_id: string;
  refund_ref_id: string;
  status: string;
  errorReason?: string;
}

@Injectable()
export class SslcommerzService {
  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly isLive: boolean;
  private readonly successUrl: string;
  private readonly failUrl: string;
  private readonly cancelUrl: string;
  private readonly ipnUrl: string;
  private sslcz: any;

  constructor(
    private configService: ConfigService,
    @InjectRepository(SslcommerzPayment)
    private sslcommerzPaymentRepository: Repository<SslcommerzPayment>,
  ) {
    this.storeId = this.configService.get<string>('SSLCOMMERZ_STORE_ID') || '';
    this.storePassword = this.configService.get<string>('SSLCOMMERZ_STORE_PASSWORD') || '';
    this.isLive = this.configService.get<string>('SSLCOMMERZ_IS_LIVE') === 'true';
    
    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:5000');
    this.successUrl = `${backendUrl}/payments/sslcommerz/success`;
    this.failUrl = `${backendUrl}/payments/sslcommerz/fail`;
    this.cancelUrl = `${backendUrl}/payments/sslcommerz/cancel`;
    this.ipnUrl = `${backendUrl}/payments/sslcommerz/ipn`;

    // Initialize SSLCommerz
    this.sslcz = new SSLCommerzPayment(this.storeId, this.storePassword, this.isLive);
  }

  /**
   * Initialize a new payment transaction
   */
  async initiatePayment(paymentData: SslcommerzInitRequest): Promise<SslcommerzInitResponse> {
    try {
      // Validate amount - SSLCommerz minimum amount is typically 10 BDT
      if (paymentData.total_amount < 10) {
        throw new HttpException(
          `Invalid amount: ${paymentData.total_amount}. Minimum amount for SSLCommerz is 10 BDT`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Prepare payment data with callbacks
      const data = {
        ...paymentData,
        success_url: this.successUrl,
        fail_url: this.failUrl,
        cancel_url: this.cancelUrl,
        ipn_url: this.ipnUrl,
        product_profile: paymentData.product_profile || 'general',
        shipping_method: paymentData.shipping_method || 'NO',
      };

      // Call SSLCommerz API
      const apiResponse: SslcommerzInitResponse = await this.sslcz.init(data);

      // Check if initialization was successful
      if (apiResponse.status !== 'SUCCESS') {
        throw new HttpException(
          `SSLCommerz initialization failed: ${apiResponse.failedreason || 'Unknown error'}`,
          HttpStatus.BAD_REQUEST
        );
      }

      if (!apiResponse.GatewayPageURL) {
        throw new HttpException(
          'SSLCommerz did not return a gateway URL',
          HttpStatus.BAD_GATEWAY
        );
      }

      // Save payment record to database
      const payment = new SslcommerzPayment();
      payment.tranId = paymentData.tran_id;
      payment.merchantInvoiceNumber = paymentData.tran_id; // Using tran_id as invoice number
      payment.amount = paymentData.total_amount;
      payment.currency = paymentData.currency;
      payment.customerName = paymentData.cus_name;
      payment.customerEmail = paymentData.cus_email;
      payment.customerPhone = paymentData.cus_phone;
      payment.status = 'PENDING';
      payment.gatewayPageUrl = apiResponse.GatewayPageURL;
      payment.responseData = apiResponse;
      payment.tranDate = new Date();

      await this.sslcommerzPaymentRepository.save(payment);

      return apiResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `SSLCommerz payment initiation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate payment after successful transaction
   */
  async validatePayment(valId: string): Promise<SslcommerzValidationResponse> {
    try {
      const data = { val_id: valId };
      const validationResponse: SslcommerzValidationResponse = await this.sslcz.validate(data);

      // Check validation status
      if (validationResponse.status !== 'VALID' && validationResponse.status !== 'VALIDATED') {
        throw new HttpException(
          `Payment validation failed: ${validationResponse.error || 'Invalid payment'}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Update payment record
      const payment = await this.sslcommerzPaymentRepository.findOne({
        where: { tranId: validationResponse.tran_id },
      });

      if (payment) {
        payment.valId = validationResponse.val_id;
        payment.bankTranId = validationResponse.bank_tran_id;
        payment.status = validationResponse.status;
        payment.cardType = validationResponse.card_type;
        payment.cardNo = validationResponse.card_no;
        payment.cardIssuer = validationResponse.card_issuer;
        payment.cardBrand = validationResponse.card_brand;
        payment.riskLevel = validationResponse.risk_level;
        payment.riskTitle = validationResponse.risk_title;
        payment.validationTime = new Date();
        payment.responseData = { ...payment.responseData, validation: validationResponse };

        await this.sslcommerzPaymentRepository.save(payment);
      }

      return validationResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `SSLCommerz validation failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Initiate a refund
   */
  async initiateRefund(refundData: SslcommerzRefundRequest): Promise<SslcommerzRefundResponse> {
    try {
      const data = {
        refund_amount: refundData.refund_amount,
        refund_remarks: refundData.refund_remarks,
        bank_tran_id: refundData.bank_tran_id,
        refe_id: refundData.refe_id,
      };

      const refundResponse: SslcommerzRefundResponse = await this.sslcz.initiateRefund(data);

      // Check refund status
      if (refundResponse.status !== 'success') {
        throw new HttpException(
          `Refund initiation failed: ${refundResponse.errorReason || 'Unknown error'}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Update payment record
      const payment = await this.sslcommerzPaymentRepository.findOne({
        where: { bankTranId: refundData.bank_tran_id },
      });

      if (payment) {
        payment.refundRefId = refundResponse.refund_ref_id;
        payment.refundAmount = refundData.refund_amount;
        payment.refundRemarks = refundData.refund_remarks;
        payment.refundTime = new Date();
        payment.status = 'REFUNDED';
        payment.responseData = { ...payment.responseData, refund: refundResponse };

        await this.sslcommerzPaymentRepository.save(payment);
      }

      return refundResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `SSLCommerz refund failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Query refund status
   */
  async queryRefundStatus(refundRefId: string): Promise<any> {
    try {
      const data = { refund_ref_id: refundRefId };
      const response = await this.sslcz.refundQuery(data);
      return response;
    } catch (error) {
      throw new HttpException(
        `SSLCommerz refund query failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Query transaction status by transaction ID
   */
  async queryTransactionByTransactionId(tranId: string): Promise<any> {
    try {
      const data = { tran_id: tranId };
      const response = await this.sslcz.transactionQueryByTransactionId(data);
      return response;
    } catch (error) {
      throw new HttpException(
        `SSLCommerz transaction query failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Query transaction status by session ID
   */
  async queryTransactionBySessionId(sessionKey: string): Promise<any> {
    try {
      const data = { sessionkey: sessionKey };
      const response = await this.sslcz.transactionQueryBySessionId(data);
      return response;
    } catch (error) {
      throw new HttpException(
        `SSLCommerz transaction query failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get payment by transaction ID with related data
   */
  async getPaymentByTransactionId(tranId: string): Promise<SslcommerzPayment | null> {
    return this.sslcommerzPaymentRepository.findOne({
      where: { tranId },
      relations: ['organization', 'subscription'],
    });
  }

  /**
   * Get payment by merchant invoice number with related data
   */
  async getPaymentByInvoiceNumber(merchantInvoiceNumber: string): Promise<SslcommerzPayment | null> {
    return this.sslcommerzPaymentRepository.findOne({
      where: { merchantInvoiceNumber },
      relations: ['organization', 'subscription'],
    });
  }

  /**
   * Get payment by validation ID
   */
  async getPaymentByValidationId(valId: string): Promise<SslcommerzPayment | null> {
    return this.sslcommerzPaymentRepository.findOne({
      where: { valId },
      relations: ['organization', 'subscription'],
    });
  }

  /**
   * Link payment to organization and subscription
   */
  async linkPaymentToSubscription(
    tranId: string,
    organizationId: string,
    subscriptionId?: string
  ): Promise<SslcommerzPayment | null> {
    try {
      const payment = await this.sslcommerzPaymentRepository.findOne({
        where: { tranId },
      });

      if (!payment) {
        return null;
      }

      // Set organization ID and subscription ID
      await this.sslcommerzPaymentRepository.update(
        { tranId },
        {
          organization: { id: organizationId } as any,
          subscription: subscriptionId ? { id: subscriptionId } as any : null
        }
      );

      return this.getPaymentByTransactionId(tranId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Test SSLCommerz connectivity and configuration
   */
  async testConnection(): Promise<{
    configured: boolean;
    storeIdSet: boolean;
    storePasswordSet: boolean;
    mode: string;
    error?: string;
  }> {
    try {
      const configured = !!(this.storeId && this.storePassword);
      
      return {
        configured,
        storeIdSet: !!this.storeId,
        storePasswordSet: !!this.storePassword,
        mode: this.isLive ? 'live' : 'sandbox',
      };
    } catch (error) {
      return {
        configured: false,
        storeIdSet: false,
        storePasswordSet: false,
        mode: 'unknown',
        error: error.message
      };
    }
  }
}

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BkashPayment } from '../entities/bkash-payment.entity';

export interface BkashTokenResponse {
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface BkashCreatePaymentRequest {
  mode: '0011'; // Tokenized checkout
  payerReference: string;
  callbackURL: string;
  amount: string;
  currency: 'BDT';
  intent: 'sale';
  merchantInvoiceNumber: string;
}

export interface BkashCreatePaymentResponse {
  paymentID: string;
  bkashURL: string;
  callbackURL: string;
  successCallbackURL: string;
  failureCallbackURL: string;
  cancelledCallbackURL: string;
  amount: string;
  intent: string;
  currency: string;
  paymentCreateTime: string;
  transactionStatus: string;
  merchantInvoiceNumber: string;
}

export interface BkashExecutePaymentResponse {
  paymentID: string;
  trxID: string;
  transactionStatus: string;
  amount: string;
  currency: string;
  intent: string;
  paymentExecuteTime: string;
  merchantInvoiceNumber: string;
  updateTime: string;
}

@Injectable()
export class BkashService {
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly username: string;
  private readonly password: string;
  private readonly callbackUrl: string;
  private httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(
    private configService: ConfigService,
    @InjectRepository(BkashPayment)
    private bkashPaymentRepository: Repository<BkashPayment>,
  ) {
    this.baseUrl = this.configService.get<string>('BKASH_BASE_URL', 'https://tokenized.pay.bka.sh/v1.2.0-beta');
    this.appKey = this.configService.get<string>('BKASH_APP_KEY') || '';
    this.appSecret = this.configService.get<string>('BKASH_APP_SECRET') || '';
    this.username = this.configService.get<string>('BKASH_USERNAME') || '';
    this.password = this.configService.get<string>('BKASH_PASSWORD') || '';
    this.callbackUrl = this.configService.get<string>('BKASH_CALLBACK_URL', 'http://localhost:3000/payments/bkash/callback');

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-APP-Key': this.appKey,
      },
    });

    // Add request interceptor to handle token refresh
    this.httpClient.interceptors.request.use(async (config) => {
      // Skip authorization for token-related endpoints
      if (config.url?.includes('/token/grant') || config.url?.includes('/token/refresh')) {
        return config;
      }

      // For all other endpoints, ensure we have a valid token
      const token = await this.getValidToken();
      if (token) {
        config.headers.Authorization = token;
      } else {
        throw new Error('Unable to obtain valid authentication token');
      }
      return config;
    }, (error) => {
      return Promise.reject(error);
    });

    // Add response interceptor to handle errors
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        throw new HttpException(
          error.response?.data?.errorMessage || error.message || 'bKash API error',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      },
    );
  }

  /**
   * Grant token from bKash (public for testing)
   */
  async grantToken(): Promise<BkashTokenResponse> {
    try {
      // Correct bKash API format - username and password in headers, app_key and app_secret in body
      const requestData = {
        app_key: this.appKey,
        app_secret: this.appSecret,
      };
      
      // Create a fresh axios instance specifically for token grant to avoid interceptors
      const tokenClient = axios.create({
        baseURL: this.baseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'username': this.username,
          'password': this.password,
          'X-APP-Key': this.appKey,
        },
      });
      
      const response = await tokenClient.post('/tokenized/checkout/token/grant', requestData);
      
      const tokenData: BkashTokenResponse = response.data;
      
      if (!tokenData.id_token) {
        throw new Error('No id_token received from bKash');
      }
      
      this.accessToken = tokenData.id_token;
      this.refreshToken = tokenData.refresh_token;
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      
      return tokenData;
    } catch (error) {
      throw new HttpException(
        `bKash authentication failed: ${error.response?.data?.message || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Refresh token
   */
  async refreshAccessToken(): Promise<BkashTokenResponse> {
    if (!this.refreshToken) {
      return this.grantToken();
    }

    try {
      const response = await this.httpClient.post('/tokenized/checkout/token/refresh', {
        app_key: this.appKey,
        app_secret: this.appSecret,
        refresh_token: this.refreshToken,
      });

      const tokenData: BkashTokenResponse = response.data;
      
      if (!tokenData.id_token) {
        throw new Error('No id_token received from refresh');
      }
      
      this.accessToken = tokenData.id_token;
      this.refreshToken = tokenData.refresh_token;
      this.tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

      return tokenData;
    } catch (error) {
      return this.grantToken();
    }
  }

  /**
   * Get valid token (refresh if expired)
   */
  private async getValidToken(): Promise<string | null> {
    try {
      // Check if we have a token and if it's still valid
      if (!this.accessToken || !this.tokenExpiresAt || this.tokenExpiresAt <= new Date()) {
        await this.refreshAccessToken();
      }
      
      if (!this.accessToken) {
        return null;
      }
      
      return this.accessToken;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create payment
   */
  async createPayment(paymentData: BkashCreatePaymentRequest): Promise<BkashCreatePaymentResponse> {
    try {
      // Validate amount - bKash minimum amount is typically 1 BDT
      const amount = parseFloat(paymentData.amount);
      if (isNaN(amount) || amount < 1) {
        throw new HttpException(
          `Invalid amount: ${paymentData.amount}. Minimum amount for bKash is 1 BDT`,
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Ensure we have a valid token before making payment request
      const token = await this.getValidToken();
      if (!token) {
        throw new HttpException(
          'Unable to obtain valid bKash authentication token',
          HttpStatus.UNAUTHORIZED
        );
      }
      
      const response = await this.httpClient.post('/tokenized/checkout/create', paymentData);
      
      // More detailed response validation
      if (!response.data) {
        throw new HttpException(
          'Empty response from bKash API',
          HttpStatus.BAD_GATEWAY
        );
      }
      
      if (!response.data.paymentID) {
        // Check if there's an error in the response
        if (response.data.errorCode || response.data.errorMessage) {
          throw new HttpException(
            `bKash API error: ${response.data.errorMessage || response.data.errorCode}`,
            HttpStatus.BAD_REQUEST
          );
        }
        
        // Check for status code errors
        if (response.data.statusCode) {
          const statusMessage = response.data.statusMessage || 'Unknown error';
          throw new HttpException(
            `bKash API error (${response.data.statusCode}): ${statusMessage}`,
            HttpStatus.BAD_REQUEST
          );
        }
        
        throw new HttpException(
          'Invalid response from bKash: missing paymentID',
          HttpStatus.BAD_GATEWAY
        );
      }
      
      const payment = new BkashPayment();
      payment.paymentId = response.data.paymentID;
      payment.merchantInvoiceNumber = paymentData.merchantInvoiceNumber;
      payment.amount = parseFloat(paymentData.amount);
      payment.currency = paymentData.currency;
      payment.payerReference = paymentData.payerReference;
      payment.status = 'CREATED';
      payment.bkashUrl = response.data.bkashURL;
      payment.callbackUrl = paymentData.callbackURL;
      payment.paymentCreateTime = this.parseDate(response.data.paymentCreateTime);

      await this.bkashPaymentRepository.save(payment);

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute payment
   */
  async executePayment(paymentId: string): Promise<BkashExecutePaymentResponse> {
    try {
      const response = await this.httpClient.post('/tokenized/checkout/execute', {
        paymentID: paymentId,
      });

      // Update payment record
      const payment = await this.bkashPaymentRepository.findOne({
        where: { paymentId },
      });

      if (payment) {
        payment.trxId = response.data.trxID;
        payment.status = response.data.transactionStatus;
        payment.paymentExecuteTime = this.parseDate(response.data.paymentExecuteTime) || new Date();
        payment.updateTime = this.parseDate(response.data.updateTime) || new Date();
        await this.bkashPaymentRepository.save(payment);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Query payment status
   */
  async queryPayment(paymentId: string): Promise<any> {
    try {
      const response = await this.httpClient.post('/tokenized/checkout/payment/status', {
        paymentID: paymentId,
      });

      // Update payment record if exists
      const payment = await this.bkashPaymentRepository.findOne({
        where: { paymentId },
      });

      if (payment) {
        payment.status = response.data.transactionStatus;
        payment.updateTime = new Date();
        await this.bkashPaymentRepository.save(payment);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search transaction
   */
  async searchTransaction(trxId: string): Promise<any> {
    try {
      const response = await this.httpClient.post('/tokenized/checkout/general/searchTrxID', {
        trxID: trxId,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(data: {
    paymentId: string;
    trxId: string;
    amount: string;
    sku: string;
    reason: string;
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/tokenized/checkout/payment/refund', {
        paymentID: data.paymentId,
        trxID: data.trxId,
        amount: data.amount,
        sku: data.sku,
        reason: data.reason,
      });

      // Update payment record
      const payment = await this.bkashPaymentRepository.findOne({
        where: { paymentId: data.paymentId },
      });

      if (payment) {
        payment.refundId = response.data.refundTrxID;
        payment.refundAmount = parseFloat(data.amount);
        payment.refundTime = this.parseDate(response.data.completedTime) || new Date();
        payment.status = 'REFUNDED';
        await this.bkashPaymentRepository.save(payment);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Query refund status
   */
  async queryRefundStatus(paymentId: string, trxId: string): Promise<any> {
    try {
      const response = await this.httpClient.post('/tokenized/checkout/payment/refund', {
        paymentID: paymentId,
        trxID: trxId,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get payment by merchant invoice number with related data
   */
  async getPaymentByInvoiceNumber(merchantInvoiceNumber: string): Promise<BkashPayment | null> {
    return this.bkashPaymentRepository.findOne({
      where: { merchantInvoiceNumber },
      relations: ['organization', 'subscription'],
    });
  }

  /**
   * Get payment by ID with related data
   */
  async getPaymentById(paymentId: string): Promise<BkashPayment | null> {
    return this.bkashPaymentRepository.findOne({
      where: { paymentId },
      relations: ['organization', 'subscription'],
    });
  }

  /**
   * Link payment to organization and subscription
   */
  async linkPaymentToSubscription(
    paymentId: string, 
    organizationId: string, 
    subscriptionId?: string
  ): Promise<BkashPayment | null> {
    try {
      const payment = await this.bkashPaymentRepository.findOne({
        where: { paymentId },
      });

      if (!payment) {
        return null;
      }

      // Set organization ID directly (assuming the column exists)
      await this.bkashPaymentRepository.update(
        { paymentId },
        { 
          organization: { id: organizationId } as any,
          subscription: subscriptionId ? { id: subscriptionId } as any : null
        }
      );

      return this.getPaymentById(paymentId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Test bKash API connectivity and authentication
   */
  async testConnection(): Promise<{
    connectivity: boolean;
    authentication: boolean;
    tokenDetails?: any;
    error?: string;
  }> {
    try {
      // Test 1: Basic connectivity with a simple HTTP request
      const testClient = axios.create({
        baseURL: this.baseUrl,
        timeout: 10000,
      });
      
      let connectivityTest = false;
      try {
        // Just try to connect to the base URL
        await testClient.get('/');
        connectivityTest = true;
      } catch (error) {
        // Even if base URL fails, token endpoint might work
      }
      
      // Test 2: Authentication token generation
      try {
        const tokenResult = await this.grantToken();
        return {
          connectivity: true,
          authentication: true,
          tokenDetails: {
            tokenType: tokenResult.token_type,
            expiresIn: tokenResult.expires_in,
            hasIdToken: !!tokenResult.id_token,
            hasRefreshToken: !!tokenResult.refresh_token,
            tokenLength: tokenResult.id_token?.length || 0,
          }
        };
      } catch (authError) {
        return {
          connectivity: connectivityTest,
          authentication: false,
          error: authError.message
        };
      }
    } catch (error) {
      return {
        connectivity: false,
        authentication: false,
        error: error.message
      };
    }
  }

  /**
   * Parse date string safely, returning null for invalid dates
   */
  private parseDate(dateString?: string): Date | null {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }
}

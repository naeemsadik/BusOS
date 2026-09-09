import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BkashService } from './bkash.service';
import { SslcommerzService } from './sslcommerz.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../entities';
import { SubscriptionService } from '../subscription/subscription.service';
import { SmsService } from '../sms/sms.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private bkashService: BkashService,
    private sslcommerzService: SslcommerzService,
    private configService: ConfigService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => SmsService))
    private smsService: SmsService,
  ) {}

  @Post('bkash/execute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Execute bKash payment' })
  @ApiResponse({ status: 200, description: 'Payment executed successfully' })
  async executePayment(
    @CurrentUser() user: User,
    @Body() body: { paymentId: string },
  ) {
    return this.bkashService.executePayment(body.paymentId);
  }

  @Post('bkash/query')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query bKash payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async queryPayment(
    @CurrentUser() user: User,
    @Body() body: { paymentId: string },
  ) {
    return this.bkashService.queryPayment(body.paymentId);
  }

  @Post('bkash/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund bKash payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  async refundPayment(
    @CurrentUser() user: User,
    @Body() body: {
      paymentId: string;
      trxId: string;
      amount: string;
      sku: string;
      reason: string;
    },
  ) {
    return this.bkashService.refundPayment(body);
  }

  @Get('bkash/transaction/:trxId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search bKash transaction' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  async searchTransaction(
    @CurrentUser() user: User,
    @Param('trxId') trxId: string,
  ) {
    return this.bkashService.searchTransaction(trxId);
  }

  @Get('bkash/payment/:paymentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get bKash payment details' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved' })
  async getPayment(
    @CurrentUser() user: User,
    @Param('paymentId') paymentId: string,
  ) {
    return this.bkashService.getPaymentById(paymentId);
  }

  @Post('bkash/callback')
  @ApiOperation({ summary: 'bKash payment callback (POST)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend callback' })
  async bkashCallback(
    @Body() body: any,
    @Query() query: any,
    @Res() res: Response,
  ) {
    try {
      const paymentID = query.paymentID || body.paymentID;
      const status = query.status || body.status;
      const signature = query.signature || body.signature;
      const apiVersion = query.apiVersion || body.apiVersion;
      
      // Build redirect URL with all callback parameters
      const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
      const callbackParams = new URLSearchParams();
      
      if (paymentID) callbackParams.set('paymentID', paymentID);
      if (status) callbackParams.set('status', status);
      if (signature) callbackParams.set('signature', signature);
      if (apiVersion) callbackParams.set('apiVersion', apiVersion);
      
      const redirectUrl = `${frontendUrl}/payments/bkash/callback?${callbackParams.toString()}`;
      
      // Process payment in background (don't wait for it)
      this.processPaymentAsync(paymentID, status).catch(() => {
        // Silent error handling for background process
      });
      
      return res.redirect(redirectUrl);
    } catch (error) {
      // Redirect to failure page with error
      const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
      const errorParams = new URLSearchParams({
        paymentID: query.paymentID || body.paymentID || 'unknown',
        status: 'failure',
        error: error.message || 'Processing error'
      });
      
      const redirectUrl = `${frontendUrl}/payments/bkash/callback?${errorParams.toString()}`;
      return res.redirect(redirectUrl);
    }
  }
  
  private async processPaymentAsync(paymentID: string, status: string) {
    try {
      if (!paymentID) {
        return;
      }
      
      // Query the payment status to get the latest information
      const paymentStatus = await this.bkashService.queryPayment(paymentID);
      
      // If payment is successful, execute it
      if (status === 'success' || paymentStatus.transactionStatus === 'Completed') {
        const result = await this.bkashService.executePayment(paymentID);
        try {
          const paymentRecord = await this.bkashService.getPaymentById(paymentID);
          if (paymentRecord && paymentRecord.merchantInvoiceNumber) {
            // Check if this is a subscription payment
            if (paymentRecord.merchantInvoiceNumber.startsWith('sub_')) {
              await this.subscriptionService.confirmSubscriptionPayment(
                paymentRecord.merchantInvoiceNumber
              );
            }
            // Check if this is an SMS payment
            else if (paymentRecord.merchantInvoiceNumber.startsWith('SMS-')) {
              await this.smsService.confirmSmsPayment(paymentID);
            }
          }
        } catch (confirmationError) {
          // Silent error handling for payment confirmation
        }
      }
    } catch (error) {
      // Silent error handling for payment processing
    }
  }

  @Get('bkash/callback')
  @ApiOperation({ summary: 'bKash payment callback (GET)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend callback' })
  async bkashCallbackGet(@Query() query: any, @Res() res: Response) {
    // bKash may also send GET callbacks
    return this.bkashCallback({}, query, res);
  }

  @Get('bkash/success')
  @ApiOperation({ summary: 'bKash payment success page' })
  async paymentSuccess(@Query() query: any, @Res() res: Response) {
    // Redirect user to success page in frontend
    const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
    const redirectUrl = `${frontendUrl}/payments/success?paymentID=${query.paymentID || ''}&status=success`;
    return res.redirect(redirectUrl);
  }

  @Get('bkash/failure')
  @ApiOperation({ summary: 'bKash payment failure page' })
  async paymentFailure(@Query() query: any, @Res() res: Response) {
    // Redirect user to failure page in frontend
    const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
    const redirectUrl = `${frontendUrl}/payments/failure?paymentID=${query.paymentID || ''}&error=${encodeURIComponent(query.error || 'Payment failed')}`;
    return res.redirect(redirectUrl);
  }

  @Get('bkash/cancel')
  @ApiOperation({ summary: 'bKash payment cancel page' })
  async paymentCancel(@Query() query: any, @Res() res: Response) {
    // Redirect user to cancel page in frontend
    const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
    const redirectUrl = `${frontendUrl}/payments/cancel?paymentID=${query.paymentID || ''}`;
    return res.redirect(redirectUrl);
  }

  @Post('bkash/test-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test bKash token generation' })
  @ApiResponse({ status: 200, description: 'Token test result' })
  async testBkashToken(@CurrentUser() user: User) {
    try {
      const tokenResult = await this.bkashService.grantToken();
      return {
        success: true,
        message: 'Token generated successfully',
        token: {
          token_type: tokenResult.token_type,
          expires_in: tokenResult.expires_in,
          id_token_length: tokenResult.id_token?.length || 0,
          refresh_token_length: tokenResult.refresh_token?.length || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'No response data',
      };
    }
  }

  @Post('bkash/test-connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test bKash API connectivity and authentication' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testBkashConnection(@CurrentUser() user: User) {
    try {
      const result = await this.bkashService.testConnection();
      return {
        success: result.connectivity && result.authentication,
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        connectivity: false,
        authentication: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ==================== SSLCommerz Payment Endpoints ====================

  @Post('sslcommerz/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate SSLCommerz payment' })
  @ApiResponse({ status: 200, description: 'Payment validated successfully' })
  async validateSslcommerzPayment(
    @CurrentUser() user: User,
    @Body() body: { val_id: string },
  ) {
    return this.sslcommerzService.validatePayment(body.val_id);
  }

  @Post('sslcommerz/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate SSLCommerz refund' })
  @ApiResponse({ status: 200, description: 'Refund initiated successfully' })
  async initiateSslcommerzRefund(
    @CurrentUser() user: User,
    @Body() body: {
      refund_amount: number;
      refund_remarks: string;
      bank_tran_id: string;
      refe_id: string;
    },
  ) {
    return this.sslcommerzService.initiateRefund(body);
  }

  @Post('sslcommerz/refund-query')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query SSLCommerz refund status' })
  @ApiResponse({ status: 200, description: 'Refund status retrieved' })
  async querySslcommerzRefund(
    @CurrentUser() user: User,
    @Body() body: { refund_ref_id: string },
  ) {
    return this.sslcommerzService.queryRefundStatus(body.refund_ref_id);
  }

  @Get('sslcommerz/transaction/:tranId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query SSLCommerz transaction by transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  async querySslcommerzTransaction(
    @CurrentUser() user: User,
    @Param('tranId') tranId: string,
  ) {
    return this.sslcommerzService.queryTransactionByTransactionId(tranId);
  }

  @Get('sslcommerz/payment/:tranId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SSLCommerz payment details' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved' })
  async getSslcommerzPayment(
    @CurrentUser() user: User,
    @Param('tranId') tranId: string,
  ) {
    return this.sslcommerzService.getPaymentByTransactionId(tranId);
  }

  @Post('sslcommerz/success')
  @ApiOperation({ summary: 'SSLCommerz payment success callback (POST)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend success page' })
  async sslcommerzSuccess(@Body() body: any, @Res() res: Response) {
    try {
      const { val_id, tran_id, amount, card_type, status } = body;

      // Validate the payment with SSLCommerz
      if (val_id) {
        const validation = await this.sslcommerzService.validatePayment(val_id);
        
        // Process payment confirmation in background
        this.processSslcommerzPaymentAsync(tran_id, validation).catch(() => {
          // Silent error handling for background process
        });
      }

      // Redirect to frontend success page (same as bKash)
      const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
      const params = new URLSearchParams({
        tran_id: tran_id || '',
        val_id: val_id || '',
        amount: amount || '',
        status: 'success',
        paymentMethod: 'sslcommerz'
      });
      
      const redirectUrl = `${frontendUrl}/payments/success?${params.toString()}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      // Redirect to failure page with error
      const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
      const errorParams = new URLSearchParams({
        tran_id: body.tran_id || 'unknown',
        status: 'failure',
        error: error.message || 'Validation error',
        paymentMethod: 'sslcommerz'
      });
      
      const redirectUrl = `${frontendUrl}/payments/failure?${errorParams.toString()}`;
      return res.redirect(redirectUrl);
    }
  }

  @Get('sslcommerz/success')
  @ApiOperation({ summary: 'SSLCommerz payment success callback (GET)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend success page' })
  async sslcommerzSuccessGet(@Query() query: any, @Res() res: Response) {
    return this.sslcommerzSuccess(query, res);
  }

  @Post('sslcommerz/fail')
  @ApiOperation({ summary: 'SSLCommerz payment failure callback (POST)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend failure page' })
  async sslcommerzFail(@Body() body: any, @Res() res: Response) {
    const { tran_id, error } = body;
    
    // Update payment status to failed
    const payment = await this.sslcommerzService.getPaymentByTransactionId(tran_id);
    
    // Redirect to frontend failure page
    const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
    const params = new URLSearchParams({
      tran_id: tran_id || 'unknown',
      status: 'failure',
      error: error || 'Payment failed',
      paymentMethod: 'sslcommerz'
    });
    
    const redirectUrl = `${frontendUrl}/payments/failure?${params.toString()}`;
    return res.redirect(redirectUrl);
  }

  @Get('sslcommerz/fail')
  @ApiOperation({ summary: 'SSLCommerz payment failure callback (GET)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend failure page' })
  async sslcommerzFailGet(@Query() query: any, @Res() res: Response) {
    return this.sslcommerzFail(query, res);
  }

  @Post('sslcommerz/cancel')
  @ApiOperation({ summary: 'SSLCommerz payment cancel callback (POST)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend cancel page' })
  async sslcommerzCancel(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body;
    
    // Redirect to frontend cancel page
    const frontendUrl = this.configService.get<string>('FRONTEND_1_URL', 'http://localhost:3000');
    const params = new URLSearchParams({
      tran_id: tran_id || 'unknown',
      status: 'cancelled',
      paymentMethod: 'sslcommerz'
    });
    
    const redirectUrl = `${frontendUrl}/payments/cancel?${params.toString()}`;
    return res.redirect(redirectUrl);
  }

  @Get('sslcommerz/cancel')
  @ApiOperation({ summary: 'SSLCommerz payment cancel callback (GET)' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend cancel page' })
  async sslcommerzCancelGet(@Query() query: any, @Res() res: Response) {
    return this.sslcommerzCancel(query, res);
  }

  @Post('sslcommerz/ipn')
  @ApiOperation({ summary: 'SSLCommerz IPN (Instant Payment Notification) callback' })
  @ApiResponse({ status: 200, description: 'IPN processed' })
  async sslcommerzIpn(@Body() body: any) {
    try {
      const { val_id, tran_id } = body;
      
      if (val_id) {
        // Validate the payment
        const validation = await this.sslcommerzService.validatePayment(val_id);
        
        // Process payment confirmation
        await this.processSslcommerzPaymentAsync(tran_id, validation);
      }
      
      return { status: 'success', message: 'IPN processed' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  @Post('sslcommerz/test-connection')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test SSLCommerz configuration' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testSslcommerzConnection(@CurrentUser() user: User) {
    try {
      const result = await this.sslcommerzService.testConnection();
      return {
        success: result.configured,
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        configured: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Private helper method for SSLCommerz payment processing
  private async processSslcommerzPaymentAsync(tranId: string, validation: any) {
    try {
      if (!tranId) {
        return;
      }

      const paymentRecord = await this.sslcommerzService.getPaymentByTransactionId(tranId);
      
      if (paymentRecord && paymentRecord.merchantInvoiceNumber) {
        // Check if this is a subscription payment
        if (paymentRecord.merchantInvoiceNumber.startsWith('sub_')) {
          await this.subscriptionService.confirmSubscriptionPayment(
            paymentRecord.merchantInvoiceNumber
          );
        }
        // Check if this is an SMS payment
        else if (paymentRecord.merchantInvoiceNumber.startsWith('SMS-')) {
          // For SSLCommerz, we need to find the payment by transaction ID
          // and confirm it based on the validation result
          const sslPayment = await this.sslcommerzService.getPaymentByTransactionId(tranId);
          if (sslPayment) {
            await this.smsService.confirmSmsPayment(sslPayment.id, 'sslcommerz');
          }
        }
      }
    } catch (error) {
      // Silent error handling for payment processing
    }
  }
}


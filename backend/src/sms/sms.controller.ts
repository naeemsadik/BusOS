import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmsService } from './sms.service';
import { PurchaseSmsDto, SendSmsDto } from './dto/sms.dto';

@Controller('sms')
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  // SMS Balance
  @Get('balance/status')
  async getBalanceStatus(@Request() req) {
    return this.smsService.getBalanceStatus(req.user.organizationId);
  }

  // SMS Usage Statistics
  @Get('stats')
  async getSmsUsageStats(@Request() req) {
    return this.smsService.getSmsUsageStats(req.user.organizationId);
  }

  // SMS Purchase
  @Post('purchase')
  async purchaseSms(@Request() req, @Body() purchaseData: PurchaseSmsDto) {
    const paymentMethod = purchaseData.paymentMethod || 'bkash';
    return this.smsService.initiatePurchase(req.user.organizationId, purchaseData, paymentMethod);
  }

  @Post('purchase/:packageId/complete')
  async completePurchase(
    @Param('packageId') packageId: string,
    @Query('paymentId') paymentId: string,
  ) {
    return this.smsService.completePurchase(packageId, paymentId);
  }

  // SMS Sending
  @Post('send')
  async sendSms(@Request() req, @Body() smsData: SendSmsDto) {
    return this.smsService.sendSms(req.user.organizationId, smsData);
  }

  // Public SMS Settings
  @Get('settings')
  async getPublicSmsSettings() {
    return this.smsService.getPublicSmsSettings();
  }
}

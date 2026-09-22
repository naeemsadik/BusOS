import { Controller, Get, Put, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { CurrencyService, Currency } from './currency.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export class UpdateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currencyCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  currencySymbol: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  currencyName: string;
}

@Controller('api/currency')
@UseGuards(AuthGuard('jwt'))
export class CurrencyController {
  constructor(
    private readonly currencyService: CurrencyService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get()
  getAllCurrencies(): Currency[] {
    return this.currencyService.getAllCurrencies();
  }

  @Get('popular')
  getPopularCurrencies(): Currency[] {
    return this.currencyService.getPopularCurrencies();
  }

  @Get('user')
  async getUserCurrency(@Request() req): Promise<{
    currencyCode: string;
    currencySymbol: string;
    currencyName: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: req.user.id },
      select: ['currencyCode', 'currencySymbol', 'currencyName'],
    });

    return {
      currencyCode: user?.currencyCode || 'BDT',
      currencySymbol: user?.currencySymbol || '৳',
      currencyName: user?.currencyName || 'Bangladeshi Taka',
    };
  }

  @Put('user')
  async updateUserCurrency(
    @Request() req,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ): Promise<{
    currencyCode: string;
    currencySymbol: string;
    currencyName: string;
  }> {
    // Validate that the currency code exists
    const currency = this.currencyService.getCurrencyByCode(updateCurrencyDto.currencyCode);
    if (!currency) {
      throw new Error('Invalid currency code');
    }

    // Update user's currency preference
    await this.userRepository.update(req.user.id, {
      currencyCode: updateCurrencyDto.currencyCode,
      currencySymbol: updateCurrencyDto.currencySymbol,
      currencyName: updateCurrencyDto.currencyName,
    });

    return {
      currencyCode: updateCurrencyDto.currencyCode,
      currencySymbol: updateCurrencyDto.currencySymbol,
      currencyName: updateCurrencyDto.currencyName,
    };
  }
}
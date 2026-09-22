import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities';
import { UpdateOrganizationSettingsDto } from './dto';
import { CourierService } from '../delivery/courier.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private readonly courierService: CourierService,
  ) {}

  async getOrganizationSettings(organizationId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Don't expose secret keys in response
    const { steadfastSecretKey, pathaoClientSecret, pathaoPassword, ...organizationWithoutSecrets } = organization;
    return {
      ...organizationWithoutSecrets,
      steadfastSecretKey: steadfastSecretKey ? '••••••••' : null,
      pathaoClientSecret: pathaoClientSecret ? '••••••••' : null,
      pathaoPassword: pathaoPassword ? '••••••••' : null,
    } as Organization;
  }

  async updateOrganizationSettings(
    organizationId: string,
    updateSettingsDto: UpdateOrganizationSettingsDto,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // If steadfast credentials are being updated, validate them
    if (updateSettingsDto.steadfastApiKey || updateSettingsDto.steadfastSecretKey) {
      if (!updateSettingsDto.steadfastApiKey || !updateSettingsDto.steadfastSecretKey) {
        throw new BadRequestException('Both API key and secret key are required for Steadfast integration');
      }
    }

    // If pathao credentials are being updated, validate them
    if (updateSettingsDto.pathaoClientId || updateSettingsDto.pathaoClientSecret || updateSettingsDto.pathaoUsername || updateSettingsDto.pathaoPassword) {
      if (!updateSettingsDto.pathaoClientId || !updateSettingsDto.pathaoClientSecret || !updateSettingsDto.pathaoUsername || !updateSettingsDto.pathaoPassword) {
        throw new BadRequestException('Client ID, Client Secret, Username, and Password are required for Pathao integration');
      }
    }

    // Update organization settings
    Object.assign(organization, updateSettingsDto);
    
    const updatedOrganization = await this.organizationRepository.save(organization);

    // Don't expose secret keys in response
    const { steadfastSecretKey, pathaoClientSecret, pathaoPassword, ...organizationWithoutSecrets } = updatedOrganization;
    return {
      ...organizationWithoutSecrets,
      steadfastSecretKey: steadfastSecretKey ? '••••••••' : null,
      pathaoClientSecret: pathaoClientSecret ? '••••••••' : null,
      pathaoPassword: pathaoPassword ? '••••••••' : null,
    } as Organization;
  }

  async testSteadfastConnection(organizationId: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.courierService.testSteadfastConnection(organization);
  }

  async removeSteadfastCredentials(organizationId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.organizationRepository.update(organizationId, {
      steadfastApiKey: undefined,
      steadfastSecretKey: undefined,
    });

    return this.getOrganizationSettings(organizationId);
  }

  async testPathaoConnection(organizationId: string): Promise<{ success: boolean; stores?: any; error?: string }> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.courierService.testPathaoConnection(organization);
  }

  async removePathaoCredentials(organizationId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.organizationRepository.update(organizationId, {
      pathaoClientId: undefined,
      pathaoClientSecret: undefined,
      pathaoUsername: undefined,
      pathaoPassword: undefined,
      pathaoAccessToken: undefined,
      pathaoRefreshToken: undefined,
      pathaoTokenExpiresAt: undefined,
    });

    return this.getOrganizationSettings(organizationId);
  }

  async testPaperflyConnection(organizationId: string, testOrderNumber?: string): Promise<{ success: boolean; status?: string; error?: string }> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    try {
      // Use a test order number or default one for testing
      const orderNumber = testOrderNumber || 'Z-290625-43129-A3-A6';
      
      const response = await fetch(`https://go-app.paperfly.com.bd/merchant/api/react/order/track_order.php?order_number=${orderNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        status: data.status || 'Connection successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Paperfly',
      };
    }
  }

  async removePaperflyCredentials(organizationId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.organizationRepository.update(organizationId, {
      paperflyApiKey: undefined,
    });

    const updatedOrganization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!updatedOrganization) {
      throw new NotFoundException('Organization not found');
    }

    return updatedOrganization;
  }
}

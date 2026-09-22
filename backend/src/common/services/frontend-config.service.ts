import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FrontendType } from '../enums/frontend-type.enum';

export interface FrontendConfig {
  type: FrontendType;
  url: string;
  name: string;
  description: string;
  features: string[];
}

@Injectable()
export class FrontendConfigService {
  constructor(private configService: ConfigService) {}

  getFrontendConfigs(): FrontendConfig[] {
    const configs: FrontendConfig[] = [];

    // Frontend 1 - Admin Dashboard
    const frontend1Url = this.configService.get('FRONTEND_1_URL', 'http://localhost:3000');
    if (frontend1Url) {
      configs.push({
        type: FrontendType.ADMIN_DASHBOARD,
        url: frontend1Url,
        name: 'Admin Dashboard',
        description: 'Full administrative interface with analytics and management tools',
        features: [
          'User Management',
          'Analytics Dashboard',
          'Inventory Management',
          'Report Generation',
          'System Configuration',
        ],
      });
    }

    // Frontend 2 - POS Terminal
    const frontend2Url = this.configService.get('FRONTEND_2_URL', 'http://localhost:3001');
    if (frontend2Url) {
      configs.push({
        type: FrontendType.POS_TERMINAL,
        url: frontend2Url,
        name: 'POS Terminal',
        description: 'Point of Sale terminal interface for retail operations',
        features: [
          'Product Scanning',
          'Order Processing',
          'Payment Management',
          'Receipt Generation',
          'Inventory Lookup',
        ],
      });
    }

    // Frontend 3 - Mobile App (optional)
    const frontend3Url = this.configService.get('FRONTEND_3_URL');
    if (frontend3Url) {
      configs.push({
        type: FrontendType.MOBILE_APP,
        url: frontend3Url,
        name: 'Mobile App',
        description: 'Mobile application for on-the-go management',
        features: [
          'Mobile POS',
          'Inventory Check',
          'Quick Orders',
          'Push Notifications',
        ],
      });
    }

    // Frontend 4 - Web Shop (optional)
    const frontend4Url = this.configService.get('FRONTEND_4_URL');
    if (frontend4Url) {
      configs.push({
        type: FrontendType.WEB_SHOP,
        url: frontend4Url,
        name: 'Web Shop',
        description: 'E-commerce web interface for customers',
        features: [
          'Product Catalog',
          'Shopping Cart',
          'Customer Orders',
          'Payment Processing',
        ],
      });
    }

    return configs;
  }

  getFrontendConfig(type: FrontendType): FrontendConfig | undefined {
    return this.getFrontendConfigs().find(config => config.type === type);
  }

  isValidFrontendUrl(url: string): boolean {
    const allowedUrls = this.getFrontendConfigs().map(config => config.url);
    return allowedUrls.includes(url);
  }

  getFrontendByUrl(url: string): FrontendConfig | undefined {
    return this.getFrontendConfigs().find(config => config.url === url);
  }
}

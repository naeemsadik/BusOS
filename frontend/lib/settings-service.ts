import { api } from './api';

export interface OrganizationSettings {
  id: string;
  name: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  logo?: string;
  isActive: boolean;
  // Courier Service API credentials
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  pathaoClientId?: string;
  pathaoClientSecret?: string;
  pathaoUsername?: string;
  pathaoPassword?: string;
  // Read-only Pathao tokens (managed by backend)
  pathaoAccessToken?: string;
  pathaoRefreshToken?: string;
  pathaoTokenExpiresAt?: string;
  redxApiKey?: string;
  redxEnvironment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationSettingsData {
  name?: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  logo?: string;
  // Courier Service API credentials
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  pathaoClientId?: string;
  pathaoClientSecret?: string;
  pathaoUsername?: string;
  pathaoPassword?: string;
  redxApiKey?: string;
  redxEnvironment?: string;
}

export interface CourierConnectionTest {
  success: boolean;
  balance?: number | null;
  stores?: any;
  error?: string;
  message?: string;
}

class SettingsService {
  async getOrganizationSettings(): Promise<OrganizationSettings> {
    const response = await api.get('/settings/organization');
    return response.data;
  }

  async updateOrganizationSettings(data: UpdateOrganizationSettingsData): Promise<OrganizationSettings> {
    const response = await api.put('/settings/organization', data);
    return response.data;
  }

  // New courier provider methods
  async testCourierConnection(provider: 'steadfast' | 'pathao'): Promise<CourierConnectionTest> {
    try {
      const response = await api.post(`/settings/${provider}/test`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Connection test failed',
      };
    }
  }

  async removeCourierCredentials(provider: 'steadfast' | 'pathao' | 'redx'): Promise<OrganizationSettings> {
    const response = await api.delete(`/settings/${provider}`);
    return response.data;
  }
}

export const settingsService = new SettingsService();

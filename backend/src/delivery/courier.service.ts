import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Organization, DeliveryStatus } from '../entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import RouteXpress from 'routexpress-bd';

export type CourierProvider = 'steadfast' | 'pathao' | 'redx' | 'paperfly';

export interface SteadfastOrder {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  alternative_phone?: string;
  recipient_email?: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
  total_lot?: number;
  delivery_type?: number;
}

export interface SteadfastOrderResponse {
  status: number;
  message: string;
  consignment?: {
    consignment_id: number;
    invoice: string;
    tracking_code: string;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    status: string;
    note?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface SteadfastBulkOrderResponse {
  invoice: string;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  cod_amount: string;
  note?: string;
  consignment_id: number | null;
  tracking_code: string | null;
  status: 'success' | 'error';
}

export interface SteadfastStatusResponse {
  status: number;
  delivery_status: string;
}

export interface SteadfastBalanceResponse {
  status: number;
  current_balance: number;
}

// Pathao Interfaces
export interface PathaoTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface PathaoOrderRequest {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: 12 | 48; // 12 for On Demand, 48 for Normal
  item_type: 1 | 2; // 1 for Document, 2 for Parcel
  item_quantity: number;
  item_weight: number;
  amount_to_collect: number;
  item_description?: string;
  special_instruction?: string;
}

export interface PathaoOrderResponse {
  message: string;
  type: string;
  code: number;
  data: {
    consignment_id: string;
    merchant_order_id: string;
    order_status: string;
    delivery_fee: number;
  };
}


// Paperfly interfaces
export interface PaperflyTrackingResponse {
  sender: {
    full_name: string;
    phone_number: string;
    thana_name: string;
    district: string;
  };
  receiver: {
    full_name: string;
    phone_number: string;
    thana_name: string;
    district: string;
    address_line: string;
  };
  package: {
    package_option: string;
    merchant_provide_weight: string;
    collectable_amount: number;
    collected_amount: number;
    merchant_order_ref: string;
    package_description: string;
  };
  status: string;
  order_number: string;
  timeline: Array<{
    date_time: string;
    message: string;
  }>;
}

export interface CourierOrder {
  provider: CourierProvider;
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  alternative_phone?: string;
  recipient_email?: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
  total_lot?: number;
  delivery_type?: number;
  // Pathao specific fields
  store_id?: number;
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  item_type?: 1 | 2;
  item_weight?: number;
}

export interface CourierOrderResponse {
  provider: CourierProvider;
  success: boolean;
  consignment_id?: string | number;
  tracking_code?: string;
  invoice?: string;
  message?: string;
  error?: string;
  data?: any;
}

export interface CourierStatusResponse {
  provider: CourierProvider;
  consignment_id?: string;
  tracking_code?: string;
  status: string;
  delivery_status: string;
  data?: any;
}

export interface CourierBalanceResponse {
  provider: CourierProvider;
  balance: number | null;
  currency?: string;
  message?: string;
}

@Injectable()
export class CourierService {
  private readonly paperflyBaseUrl = 'https://go-app.paperfly.com.bd/merchant/api/react/order';

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) { }

  private getClient(organization: Organization): any {
    return new RouteXpress({
      steadfast: {
        apiKey: organization.steadfastApiKey,
        apiSecret: organization.steadfastSecretKey,
      },
      pathao: {
        apiKey: organization.pathaoClientId,
        apiSecret: organization.pathaoClientSecret,
        username: organization.pathaoUsername,
        password: organization.pathaoPassword,
      },
    });
  }

  private async getPathaoAccessToken(organization: Organization, client: any): Promise<string> {
    if (organization.pathaoAccessToken && organization.pathaoTokenExpiresAt && new Date() < organization.pathaoTokenExpiresAt) {
      return organization.pathaoAccessToken;
    }

    try {
      const response = await client.createPathaoToken();

      const expiresIn = response.expires_in || 3600;
      const expiresAt = new Date(Date.now() + (expiresIn - 300) * 1000);

      organization.pathaoAccessToken = response.access_token;
      organization.pathaoRefreshToken = response.refresh_token;
      organization.pathaoTokenExpiresAt = expiresAt;

      await this.organizationRepository.save(organization);

      return response.access_token;
    } catch (error) {
      console.error('Pathao token request failed:', error);
      throw new HttpException(`Pathao token request failed: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  private async makePaperflyRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    params?: Record<string, string>
  ): Promise<any> {
    let url = `${this.paperflyBaseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST') {
        fetchOptions.body = JSON.stringify({});
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Paperfly API request failed:`, error);
      throw new HttpException(
        `Paperfly API request failed: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createOrder(
    order: CourierOrder,
    organization: Organization,
  ): Promise<CourierOrderResponse> {
    switch (order.provider) {
      case 'steadfast':
        return this.createSteadfastOrder(order, organization);
      case 'pathao':
        return this.createPathaoOrder(order, organization);
      case 'paperfly':
        throw new HttpException(
          'Paperfly does not support order creation through API. It is tracking-only service.',
          HttpStatus.BAD_REQUEST,
        );
      default:
        throw new HttpException(
          `Provider '${order.provider}' is not supported.`,
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  async createSteadfastOrder(
    order: CourierOrder,
    organization: Organization,
  ): Promise<CourierOrderResponse> {
    try {
      const client = this.getClient(organization);
      const orderData = {
        provider: "steadfast",
        order_details: {
          invoice: order.invoice,
          recipient_name: order.recipient_name,
          recipient_phone: order.recipient_phone,
          alternative_phone: order.alternative_phone,
          recipient_email: order.recipient_email,
          recipient_address: order.recipient_address,
          cod_amount: order.cod_amount,
          note: order.note,
          item_description: order.item_description,
          total_lot: order.total_lot,
          delivery_type: order.delivery_type || 0,
        },
      };

      const response = await client.createOrder("steadfast", orderData);

      if (response && response.consignment) {
        return {
          provider: 'steadfast',
          success: true,
          consignment_id: response.consignment.consignment_id.toString(),
          tracking_code: response.consignment.tracking_code,
          invoice: response.consignment.invoice,
          message: response.message,
          data: response,
        };
      } else {
        return {
          provider: 'steadfast',
          success: false,
          error: response.message || 'Failed to create Steadfast order',
          data: response,
        };
      }
    } catch (error) {
      console.error('Steadfast create order error:', error);
      return {
        provider: 'steadfast',
        success: false,
        error: error.message || 'Failed to create Steadfast delivery order',
      };
    }
  }

  async createPathaoOrder(
    order: CourierOrder,
    organization: Organization,
  ): Promise<CourierOrderResponse> {
    const missing: string[] = []
    if (!order.store_id) missing.push('store_id')
    if (!order.recipient_city) missing.push('recipient_city')
    if (!order.recipient_zone) missing.push('recipient_zone')
    if (!order.item_type) missing.push('item_type')
    if (!order.item_weight) missing.push('item_weight')
    if (missing.length > 0) {
      throw new HttpException(`Missing required fields for Pathao order: ${missing.join(', ')}`, HttpStatus.BAD_REQUEST);
    }
    try {
      const client = this.getClient(organization);
      const authToken = await this.getPathaoAccessToken(organization, client);

      const pathaoOrder = {
        authToken: authToken,
        store_id: order.store_id as number,
        merchant_order_id: order.invoice,
        recipient_name: order.recipient_name,
        recipient_phone: order.recipient_phone,
        recipient_address: order.recipient_address,
        recipient_city: order.recipient_city as number,
        recipient_zone: order.recipient_zone as number,
        delivery_type: (order.delivery_type === 12 || order.delivery_type === 48) ? order.delivery_type : 48,
        item_type: order.item_type as 1 | 2,
        item_quantity: order.total_lot || 1,
        item_weight: order.item_weight as number,
        recipient_area: (order as any).recipient_area ? Number((order as any).recipient_area) : undefined,
        amount_to_collect: order.cod_amount,
        item_description: order.item_description,
        special_instruction: order.note,
      };

      const response = await client.createOrder("pathao", pathaoOrder);

      if (response.code === 200 && response.data) {
        return {
          provider: 'pathao',
          success: true,
          consignment_id: response.data.consignment_id,
          invoice: response.data.merchant_order_id,
          message: response.message,
          data: response,
        };
      } else {
        return {
          provider: 'pathao',
          success: false,
          error: response.message || 'Failed to create Pathao order',
          data: response,
        };
      }
    } catch (error) {
      console.error('Pathao create order error:', error);
      return {
        provider: 'pathao',
        success: false,
        error: error.message || 'Failed to create Pathao delivery order',
      };
    }
  }

  async createBulkOrders(
    orders: CourierOrder[],
    organization: Organization,
  ): Promise<CourierOrderResponse[]> {
    const results: CourierOrderResponse[] = [];
    const steadfastOrders = orders.filter(order => order.provider === 'steadfast');
    const pathaoOrders = orders.filter(order => order.provider === 'pathao');
    const unsupportedOrders = orders.filter(order => order.provider !== 'steadfast' && order.provider !== 'pathao');

    // Handle unsupported providers
    for (const order of unsupportedOrders) {
      results.push({
        provider: order.provider,
        success: false,
        invoice: order.invoice,
        error: `Provider '${order.provider}' is not currently supported for bulk orders.`,
      });
    }

    const client = this.getClient(organization);

    // Process Steadfast Orders
    if (steadfastOrders.length > 0) {
      try {
        const bulkOrderData = {
          provider: "steadfast",
          orders: steadfastOrders.map(order => ({
            invoice: order.invoice,
            recipient_name: order.recipient_name,
            recipient_phone: order.recipient_phone,
            recipient_address: order.recipient_address,
            cod_amount: order.cod_amount,
            note: order.note,
          }))
        };

        const response = await client.createBulkOrder("steadfast", bulkOrderData);

        if (Array.isArray(response)) {
          response.forEach((orderResponse: any) => {
            results.push({
              provider: 'steadfast',
              success: orderResponse.status === 'success',
              consignment_id: orderResponse.consignment_id?.toString(),
              tracking_code: orderResponse.tracking_code || undefined,
              invoice: orderResponse.invoice,
              message: orderResponse.status === 'success' ? 'Order created successfully' : 'Order creation failed',
              error: orderResponse.status === 'error' ? 'Order creation failed' : undefined,
              data: orderResponse,
            });
          });
        } else {
          console.warn('Unexpected Steadfast bulk order response structure:', response);
          steadfastOrders.forEach(order => {
            results.push({
              provider: 'steadfast',
              success: false,
              invoice: order.invoice,
              error: 'Unexpected response from bulk order API',
              data: response
            });
          });
        }
      } catch (error) {
        console.error('Steadfast bulk order error:', error);
        steadfastOrders.forEach(order => {
          results.push({
            provider: 'steadfast',
            success: false,
            invoice: order.invoice,
            error: error.message || 'Failed to create bulk Steadfast orders',
          });
        });
      }
    }

    // Process Pathao Orders
    if (pathaoOrders.length > 0) {
      try {
        const authToken = await this.getPathaoAccessToken(organization, client);

        const pathaoBulkData = {
          authToken: authToken,
          orders: pathaoOrders.map(order => ({
            store_id: order.store_id as number,
            merchant_order_id: order.invoice,
            recipient_name: order.recipient_name,
            recipient_phone: order.recipient_phone,
            recipient_address: order.recipient_address,
            recipient_city: order.recipient_city as number,
            recipient_zone: order.recipient_zone as number,
            recipient_area: (order as any).recipient_area ? Number((order as any).recipient_area) : undefined,
            delivery_type: (order.delivery_type === 12 || order.delivery_type === 48) ? order.delivery_type : 48,
            item_type: order.item_type as 1 | 2,
            item_quantity: order.total_lot || 1,
            item_weight: order.item_weight as number,
            amount_to_collect: order.cod_amount,
            item_description: order.item_description,
            special_instruction: order.note,
          }))
        };

        const response = await client.createBulkOrder("pathao", pathaoBulkData);

        // Pathao bulk response is async (202 Accepted), so it doesn't return consignment IDs immediately.
        // Response structure: { message: "...", type: "success", code: 202, data: true }

        const success = response?.code === 202 || response?.type === 'success';
        const message = response?.message || 'Bulk order request accepted';

        pathaoOrders.forEach(order => {
          results.push({
            provider: 'pathao',
            success: success,
            invoice: order.invoice,
            message: message,
            data: response,
            // No consignment_id available yet
          });
        });

      } catch (error) {
        console.error('Pathao bulk order error:', error);
        pathaoOrders.forEach(order => {
          results.push({
            provider: 'pathao',
            success: false,
            invoice: order.invoice,
            error: error.message || 'Failed to create bulk Pathao orders',
          });
        });
      }
    }

    return results;
  }

  async getOrderStatus(
    provider: CourierProvider,
    identifier: { consignment_id?: string; tracking_code?: string; invoice?: string; order_number?: string },
    organization: Organization,
  ): Promise<CourierStatusResponse> {
    if (provider === 'paperfly') {
      return this.getPaperflyOrderStatus(identifier);
    }

    try {
      const client = this.getClient(organization);
      let response: any;

      if (provider === 'steadfast') {
        if (identifier.consignment_id) {
          response = await client.getOrderStatus({
            provider: "steadfast",
            data: { consignment_id: identifier.consignment_id },
          });
        } else if (identifier.invoice) {
          response = await client.statusByInvoice(identifier.invoice);
        } else if (identifier.tracking_code) {
          response = await client.statusBytrackingcode(identifier.tracking_code);
        } else {
          throw new Error('No valid identifier provided');
        }
      } else if (provider === 'pathao') {
        const authToken = await this.getPathaoAccessToken(organization, client);
        if (identifier.consignment_id) {
          response = await client.getOrderStatus({
            provider: "pathao",
            data: {
              consignment_id: identifier.consignment_id,
              authToken: authToken
            }
          });
        } else {
          throw new Error('Pathao status check requires consignment_id currently');
        }
      }

      return {
        provider: provider,
        consignment_id: identifier.consignment_id,
        tracking_code: identifier.tracking_code,
        status: response.status?.toString() || response.order_status || 'unknown',
        delivery_status: response.delivery_status || response.order_status || 'unknown',
        data: response,
      };
    } catch (error) {
      console.error(`${provider} status check error:`, error);
      throw new HttpException(
        `Failed to check ${provider} delivery status: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getPaperflyOrderStatus(
    identifier: { order_number?: string }
  ): Promise<CourierStatusResponse> {
    if (!identifier.order_number) {
      throw new HttpException(
        'Order number is required for Paperfly tracking',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const response: PaperflyTrackingResponse = await this.makePaperflyRequest(
        '/track_order.php',
        'POST',
        { order_number: identifier.order_number }
      );

      return {
        provider: 'paperfly',
        tracking_code: response.order_number,
        status: response.status || 'unknown',
        delivery_status: response.status || 'unknown',
        data: response,
      };
    } catch (error) {
      console.error('Paperfly status check error:', error);
      throw new HttpException(
        `Failed to check Paperfly delivery status: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getBalance(
    provider: CourierProvider,
    organization: Organization,
  ): Promise<CourierBalanceResponse> {
    if (provider === 'paperfly') {
      return {
        provider: 'paperfly',
        balance: null,
        currency: 'BDT',
        message: 'Paperfly is tracking-only service, no balance available',
      };
    }

    if (provider !== 'steadfast') {
      throw new HttpException(
        `Only Steadfast courier balance is currently supported. Provider '${provider}' is not supported.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const client = this.getClient(organization);
      const response = await client.getSteadFastBalance();

      return {
        provider: 'steadfast',
        balance: response.current_balance || 0,
        currency: 'BDT',
        message: response.status === 200 ? 'Balance retrieved successfully' : 'Failed to retrieve balance',
      };
    } catch (error) {
      console.error('Steadfast balance check error:', error);
      throw new HttpException(
        `Failed to check Steadfast balance: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  mapCourierStatusToDeliveryStatus(courierStatus: string, provider: CourierProvider): DeliveryStatus {
    const statusMap: Record<string, DeliveryStatus> = {
      'pending': DeliveryStatus.PENDING,
      'confirmed': DeliveryStatus.ASSIGNED,
      'picked_up': DeliveryStatus.PICKED_UP,
      'in_transit': DeliveryStatus.IN_TRANSIT,
      'delivered': DeliveryStatus.DELIVERED,
      'cancelled': DeliveryStatus.FAILED,
      'returned': DeliveryStatus.RETURNED,
      'failed': DeliveryStatus.FAILED,
      'delivered_approval_pending': DeliveryStatus.DELIVERED,
      'partial_delivered_approval_pending': DeliveryStatus.DELIVERED,
      'cancelled_approval_pending': DeliveryStatus.FAILED,
      'unknown_approval_pending': DeliveryStatus.PENDING,
      'partial_delivered': DeliveryStatus.DELIVERED,
      'hold': DeliveryStatus.PENDING,
      'in_review': DeliveryStatus.PENDING,
      'unknown': DeliveryStatus.PENDING,
      'assigned': DeliveryStatus.ASSIGNED,
    };

    return statusMap[courierStatus.toLowerCase()] || DeliveryStatus.PENDING;
  }

  isProviderConfigured(provider: CourierProvider, organization: Organization): boolean {
    switch (provider) {
      case 'steadfast':
        return !!(organization.steadfastApiKey && organization.steadfastSecretKey);
      case 'paperfly':
        return true;
      case 'pathao':
        return !!(organization.pathaoClientId && organization.pathaoClientSecret && organization.pathaoUsername && organization.pathaoPassword);
      case 'redx':
        return false;
      default:
        return false;
    }
  }

  getAvailableProviders(organization: Organization): CourierProvider[] {
    const providers: CourierProvider[] = [];

    if (this.isProviderConfigured('steadfast', organization)) {
      providers.push('steadfast');
    }
    if (this.isProviderConfigured('pathao', organization)) {
      providers.push('pathao');
    }

    providers.push('paperfly');

    return providers;
  }

  async testSteadfastConnection(organization: Organization): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const balanceResponse = await this.getBalance('steadfast', organization);
      return {
        success: true,
        balance: balanceResponse.balance || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Steadfast',
      };
    }
  }

  async testPathaoConnection(organization: Organization): Promise<{ success: boolean; stores?: any; error?: string }> {
    try {
      const client = this.getClient(organization);
      const authToken = await this.getPathaoAccessToken(organization, client);
      const stores = await client.getAllPathaoStore(authToken);
      return {
        success: true,
        stores,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Pathao',
      };
    }
  }

  async getPathaoStores(organization: Organization): Promise<any> {
    const client = this.getClient(organization);
    const authToken = await this.getPathaoAccessToken(organization, client);
    const res = await client.getAllPathaoStore(authToken);
    return this.normalizePathaoList(res);
  }

  async getPathaoCities(organization: Organization): Promise<any> {
    const client = this.getClient(organization);
    const authToken = await this.getPathaoAccessToken(organization, client);
    const res = await client.getPathaoCity(authToken);
    return this.normalizePathaoList(res);
  }

  async getPathaoZones(organization: Organization, cityId: number | string): Promise<any> {
    const client = this.getClient(organization);
    const authToken = await this.getPathaoAccessToken(organization, client);
    const res = await client.getPathaoZone(authToken, cityId);
    return this.normalizePathaoList(res);
  }

  async getPathaoAreas(organization: Organization, zoneId: number | string): Promise<any> {
    const client = this.getClient(organization);
    const authToken = await this.getPathaoAccessToken(organization, client);
    const res = await client.getPathaoArea(authToken, zoneId);
    return this.normalizePathaoList(res);
  }

  async getPathaoPricePlan(organization: Organization, payload: any): Promise<any> {
    const client = this.getClient(organization);
    const authToken = await this.getPathaoAccessToken(organization, client);
    const res = await client.price_plane(authToken, payload);
    return res?.data || res;
  }

  private normalizePathaoList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    if (Array.isArray(res.stores)) return res.stores;
    if (Array.isArray(res.results)) return res.results;
    if (res.data && typeof res.data === 'object') {
      const vals = Object.values(res.data).filter(v => typeof v === 'object');
      if (vals.length > 0) return vals as any[];
    }
    return [];
  }
}

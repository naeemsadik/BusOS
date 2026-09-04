import { api } from './api';

const encodePathSegment = (value: string | number): string => encodeURIComponent(String(value));

export interface CreateDeliveryData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZipCode?: string;
  deliveryType?: 'standard' | 'express' | 'same_day' | 'pickup';
  estimatedDeliveryDate: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  courierService?: string;
  deliveryFee?: number;
  notes?: string;
  deliveryInstructions?: string;
  // New courier fields
  courierProvider?: 'steadfast' | 'pathao' | 'paperfly';
  codAmount?: number; // Cash on Delivery amount for Steadfast
  alternativePhone?: string; // Alternative phone number
  itemDescription?: string; // Items description
  totalLot?: number; // Total lot/quantity
  steadfastDeliveryType?: 0 | 1; // 0 = home delivery, 1 = point delivery/hub pickup
  courierOptions?: {
    recipient_city?: string | number;
    recipient_zone?: string | number;
    recipient_area?: string | number;
    store_id?: number;
    item_description?: string;
    item_quantity?: number;
    item_weight?: number;
    delivery_type?: number;
    special_instruction?: string;
  };
}

export interface UpdateDeliveryData {
  status?: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
  courierService?: string;
  deliveryFee?: number;
  notes?: string;
  deliveryInstructions?: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZipCode?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  deliveryType: 'standard' | 'express' | 'same_day' | 'pickup';
  estimatedDeliveryDate: string;
  actualDeliveryDate?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
  courierService?: string;
  deliveryFee: number;
  notes?: string;
  deliveryInstructions?: string;
  // New courier fields
  courierProvider?: 'steadfast' | 'paperfly' | 'pathao';
  courierConsignmentId?: string;
  courierTrackingCode?: string;
  courierInvoice?: string;
  courierStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryQuery {
  search?: string;
  status?: string;
  deliveryType?: string;
  driverName?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface DeliveriesResponse {
  deliveries: Delivery[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DeliveryStats {
  total: number;
  pending: number;
  assigned: number;
  pickedUp: number;
  inTransit: number;
  delivered: number;
  failed: number;
  returned: number;
  totalFees: number;
}

class DeliveryService {
  // Pathao Tracking API (via backend proxy)
  async trackPathaoDelivery(consignmentId: string, phoneNo: string): Promise<any> {
    const response = await api.post('/delivery/courier/pathao/track', {
      consignment_id: consignmentId,
      phone_no: phoneNo,
    });
    return response.data;
  }
  async createDelivery(data: CreateDeliveryData): Promise<Delivery> {
    const response = await api.post('/delivery', data);
    return response.data;
  }

  async getDeliveries(query?: DeliveryQuery): Promise<DeliveriesResponse> {
    const response = await api.get('/delivery', { params: query });
    return response.data;
  }

  async getDelivery(id: string): Promise<Delivery> {
    const response = await api.get('/delivery/' + encodePathSegment(id));
    return response.data;
  }

  async getDeliveryByOrderId(orderId: string): Promise<Delivery | null> {
    try {
      const response = await api.get('/delivery/order/' + encodePathSegment(orderId));
      return response.data;
    } catch (error) {
      // If no delivery found, return null instead of throwing
      return null;
    }
  }

  async updateDelivery(id: string, data: UpdateDeliveryData): Promise<Delivery> {
    const response = await api.patch('/delivery/' + encodePathSegment(id), data);
    return response.data;
  }

  async deleteDelivery(id: string): Promise<void> {
    await api.delete('/delivery/' + encodePathSegment(id));
  }

  async getDeliveryStats(): Promise<DeliveryStats> {
    const response = await api.get('/delivery/stats');
    return response.data;
  }

  async trackDelivery(trackingNumber: string): Promise<Delivery> {
    const response = await api.get('/delivery/track/' + encodePathSegment(trackingNumber));
    return response.data;
  }

  async getDeliveriesByDriver(driverName: string): Promise<Delivery[]> {
    const response = await api.get('/delivery/driver/' + encodePathSegment(driverName));
    return response.data;
  }

  // New Courier Integration Methods
  async createCourierDelivery(data: CreateDeliveryData): Promise<Delivery> {
    const response = await api.post('/delivery/courier', data);
    return response.data;
  }

  async getAvailableCourierProviders(): Promise<{ providers: Array<'steadfast' | 'pathao' | 'paperfly'> }> {
    const response = await api.get('/delivery/courier/providers');
    return response.data;
  }

  async getPathaoStores(): Promise<any> {
    const response = await api.get('/delivery/courier/pathao/stores');
    return response.data;
  }

  async getPathaoCities(): Promise<any> {
    const response = await api.get('/delivery/courier/pathao/cities');
    return response.data;
  }

  async getPathaoZones(cityId: string | number): Promise<any> {
    const response = await api.get('/delivery/courier/pathao/zones/' + encodePathSegment(cityId));
    return response.data;
  }

  async getPathaoAreas(zoneId: string | number): Promise<any> {
    const response = await api.get('/delivery/courier/pathao/areas/' + encodePathSegment(zoneId));
    return response.data;
  }

  async getPathaoPricePlan(payload: { store_id: number | string; item_type: number | string; delivery_type: number | string; item_weight: number | string; recipient_city: number | string; recipient_zone: number | string }): Promise<any> {
    const response = await api.post('/delivery/courier/pathao/price-plan', payload);
    return response.data;
  }

  async getCourierBalance(provider: 'steadfast' | 'paperfly' | 'pathao'): Promise<{
    provider: string;
    balance: number;
  }> {
    const response = await api.get('/delivery/courier/' + encodePathSegment(provider) + '/balance');
    return response.data;
  }

  async syncCourierStatus(id: string): Promise<Delivery> {
    const response = await api.patch('/delivery/courier/' + encodePathSegment(id) + '/sync');
    return response.data;
  }

  async bulkSyncCourierStatus(provider?: 'steadfast' | 'paperfly' | 'pathao'): Promise<{
    updated: number;
    failed: number;
  }> {
    const response = await api.post('/delivery/courier/bulk-sync', { provider });
    return response.data;
  }

  async trackCourierDelivery(
    provider: 'steadfast' | 'paperfly' | 'pathao',
    trackingCode: string
  ): Promise<{
    provider: string;
    trackingCode: string;
    status: string;
    mappedStatus: string;
    data?: any;
  }> {
    const response = await api.get(
      '/delivery/courier/' + encodePathSegment(provider) + '/track/' + encodePathSegment(trackingCode)
    );
    return response.data;
  }

  async trackPaperflyDelivery(orderNumber: string): Promise<{
    provider: string;
    orderNumber: string;
    status: string;
    data?: any;
  }> {
    const response = await api.get('/delivery/paperfly/track/' + encodePathSegment(orderNumber));
    return response.data;
  }

  // Sync Paperfly order status with local order
  async syncPaperflyOrderStatus(paperflyOrderNumber: string, orderId: string): Promise<{
    success: boolean;
    updatedOrder?: any;
    error?: string;
  }> {
    try {

      const trackingData = await this.trackPaperflyDelivery(paperflyOrderNumber);

      if (trackingData.data) {
        const paperflyStatus = trackingData.data.status;

        let orderStatus = 'pending';
        let paymentStatus = 'pending';

        // Map Paperfly status to our order status
        switch (paperflyStatus.toLowerCase()) {
          case 'delivered':
            orderStatus = 'delivered';
            paymentStatus = 'paid'; // Assume COD is collected on delivery
            break;
          case 'on the way to delivery':
          case 'reached delivery point':
            orderStatus = 'shipped';
            break;
          case 'parcel picked':
          case 'pickup request sent':
            orderStatus = 'processing';
            break;
          case 'on hold':
            orderStatus = 'processing'; // Keep as processing but note the hold
            break;
          default:
            orderStatus = 'processing';
        }

        // Update the order with the synced status
        const updateData = {
          status: orderStatus,
          paymentStatus: paymentStatus,
          trackingNumber: paperflyOrderNumber,
          courierService: 'paperfly',
          paperflyOrderNumber: paperflyOrderNumber
        };

        const updateResponse = await api.patch('/orders/' + encodePathSegment(orderId), updateData);

        return {
          success: true,
          updatedOrder: updateResponse.data
        };
      }

      return {
        success: false,
        error: 'No tracking data found'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync status'
      };
    }
  }

  // Bulk sync all Paperfly orders
  async syncAllPaperflyOrders(): Promise<{
    success: boolean;
    syncedCount: number;
    errors: string[];
  }> {
    try {
      // Get all orders and filter for Paperfly orders on frontend
      const ordersResponse = await api.get('/orders?limit=100');
      const allOrders = ordersResponse.data.orders || [];

      // Filter for orders that have Paperfly order numbers or courier service set to paperfly
      const paperflyOrders = allOrders.filter((order: any) =>
        order.paperflyOrderNumber ||
        (order.courierService && order.courierService.toLowerCase().includes('paperfly'))
      );

      let syncedCount = 0;
      const errors: string[] = [];

      for (const order of paperflyOrders) {
        const paperflyOrderNumber = order.paperflyOrderNumber || order.trackingNumber;
        if (paperflyOrderNumber) {
          const result = await this.syncPaperflyOrderStatus(paperflyOrderNumber, order.id);
          if (result.success) {
            syncedCount++;
          } else {
            errors.push(`Order ${order.orderNumber}: ${result.error}`);
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return {
        success: true,
        syncedCount,
        errors
      };
    } catch (error) {
      console.error('Failed to bulk sync Paperfly orders:', error);
      return {
        success: false,
        syncedCount: 0,
        errors: [error instanceof Error ? error.message : 'Failed to sync orders']
      };
    }
  }

  // Convenience method to check if courier is available
  async isCourierAvailable(): Promise<boolean> {
    try {
      const { providers } = await this.getAvailableCourierProviders();
      return providers.length > 0;
    } catch {
      return false;
    }
  }
}

export const deliveryService = new DeliveryService();

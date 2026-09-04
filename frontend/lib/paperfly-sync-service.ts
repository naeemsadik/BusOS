import { deliveryService } from './delivery-service';
import { toast } from 'sonner';

class PaperflySyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private syncInProgress = false;

  // Start automatic syncing every 5 minutes
  startAutoSync(intervalMinutes: number = 5) {
    if (this.syncInterval) {
      this.stopAutoSync();
    }

    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMinutes * 60 * 1000);

    // Perform initial sync
    this.performSync();
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async performSync(showToast: boolean = false): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.syncInProgress = true;

    try {
      const result = await deliveryService.syncAllPaperflyOrders();
      
      if (showToast) {
        if (result.success) {
          toast.success(`Synced ${result.syncedCount} Paperfly orders successfully`);
          if (result.errors.length > 0) {
            toast.warning(`${result.errors.length} orders had sync errors`);
          }
        } else {
          toast.error('Failed to sync Paperfly orders');
        }
      }

      console.log('Paperfly sync completed:', result);
    } catch (error) {
      console.error('Auto sync failed:', error);
      if (showToast) {
        toast.error('Failed to sync Paperfly orders');
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync a specific order
  async syncOrder(paperflyOrderNumber: string, orderId: string, showToast: boolean = true): Promise<boolean> {
    try {
      const result = await deliveryService.syncPaperflyOrderStatus(paperflyOrderNumber, orderId);
      
      if (showToast) {
        if (result.success) {
          toast.success('Order status synced successfully');
        } else {
          toast.error(`Failed to sync order: ${result.error}`);
        }
      }

      return result.success;
    } catch (error) {
      console.error('Failed to sync order:', error);
      if (showToast) {
        toast.error('Failed to sync order status');
      }
      return false;
    }
  }

  // Check if auto sync is running
  isAutoSyncActive(): boolean {
    return this.syncInterval !== null;
  }
}

export const paperflySyncService = new PaperflySyncService();

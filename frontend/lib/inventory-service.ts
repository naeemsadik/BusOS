import { api } from './api';

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock: number;
  unit?: string;
  weight?: number;
  weightUnit?: string;
  barcode?: string;
  image?: string;
  status: 'active' | 'inactive' | 'discontinued';
  trackStock: boolean;
  allowBackorder: boolean;
  taxRate?: number;
  supplier?: string;
  notes?: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  totalValue: number;
  profitMargin: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  sku?: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  price: number;
  cost: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  weight?: number;
  weightUnit?: string;
  barcode?: string;
  image?: string;
  status?: 'active' | 'inactive' | 'discontinued';
  trackStock?: boolean;
  allowBackorder?: boolean;
  taxRate?: number;
  supplier?: string;
  notes?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductQuery {
  search?: string;
  category?: string;
  brand?: string;
  supplier?: string;
  status?: 'active' | 'inactive' | 'discontinued';
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    categories: string[];
    brands: string[];
    suppliers: string[];
  };
}

export interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoriesCount: number;
}

export interface StockMovement {
  id: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'return' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface StockAdjustmentData {
  quantity: number;
  notes?: string;
  unitCost?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

class InventoryService {
  // Product methods
  async getProducts(query?: ProductQuery): Promise<ProductsResponse> {
    const response = await api.get('/products', { params: query });
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    const response = await api.get(`/products/${id}`);
    return response.data;
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    const response = await api.post('/products', data);
    return response.data;
  }

  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    const response = await api.patch(`/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  }

  async bulkDeleteProducts(productIds: string[]): Promise<{ deleted: number }> {
    const response = await api.post('/products/bulk-delete', { productIds });
    return response.data;
  }

  async adjustStock(id: string, data: StockAdjustmentData): Promise<Product> {
    const response = await api.post(`/products/${id}/adjust-stock`, data);
    return response.data;
  }

  async generateBarcode(id: string): Promise<{ barcode: string }> {
    const response = await api.post(`/products/${id}/generate-barcode`);
    return response.data;
  }

  async getStockMovements(id: string): Promise<StockMovement[]> {
    const response = await api.get(`/products/${id}/stock-movements`);
    return response.data;
  }

  async getInventoryStats(): Promise<InventoryStats> {
    const response = await api.get('/products/stats');
    return response.data;
  }

  async getProductCategories(): Promise<string[]> {
    const response = await api.get('/products/categories');
    return response.data;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    const response = await api.get('/categories');
    return response.data;
  }

  async getCategory(id: string): Promise<Category> {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  }

  async createCategory(data: CreateCategoryData): Promise<Category> {
    const response = await api.post('/categories', data);
    return response.data;
  }

  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    const response = await api.patch(`/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  }
}

export const inventoryService = new InventoryService();

import type { ProductDeleteConfirmation } from '@/core/application/usecases/products/ProductCommandService';
import type { Product } from '@/core/domain/entities/Product';

export interface CreateProductAIResult {
  product: Product;
  refreshPaths: readonly string[];
}

export interface UpdateProductAIResult {
  product: Product;
  refreshPaths: readonly string[];
}

export interface DeleteProductAIResult {
  requiresConfirmation?: boolean;
  confirmation?: ProductDeleteConfirmation;
}

export interface GetProductAIResult {
  product: Product;
}

export interface ProductCollectionAIResult {
  total: number;
  products: Array<{
    sku: string;
    name: string;
    category: string;
    unit: string;
    minStock?: number;
    currentStock?: number;
    reorderPoint?: number;
    deficit?: number;
  }>;
}

export interface StockAIResult {
  product: {
    sku: string;
    name: string;
  };
  currentStock: number;
  reorderPoint: number;
  isLowStock: boolean;
}
import type { ProductUnit } from '@/core/domain/constants/ProductConstants';

/**
 * Product Domain Entity
 * Represents a product in the inventory system
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: ProductUnit;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input type for creating a new product
 */
export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: ProductUnit;
  minStock: number;
  reorderPoint: number;
}

/**
 * Input type for updating a product
 */
export interface UpdateProductInput {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  unit?: ProductUnit;
  minStock?: number;
  reorderPoint?: number;
}

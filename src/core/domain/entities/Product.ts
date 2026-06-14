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
  /** Unit acquisition cost, in integer cents. */
  unitCost: number;
  /** Unit selling price, in integer cents. */
  sellingPrice: number;
  /** Finished good assembled from ingredients; selling it depletes its recipe components. */
  isComposite: boolean;
  minStock: number;
  reorderPoint: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product enriched with its current stock level, computed from the sum of its
 * StockTransaction rows. Stock is NOT a stored Product attribute — use this
 * type wherever a view needs the live quantity on hand.
 */
export type ProductWithStock = Product & { currentStock: number };

/**
 * Input type for creating a new product
 */
export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category: string;
  unit: ProductUnit;
  unitCost: number;
  sellingPrice: number;
  isComposite: boolean;
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
  unitCost?: number;
  sellingPrice?: number;
  isComposite?: boolean;
  minStock?: number;
  reorderPoint?: number;
}

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
  unit: 'pcs' | 'kg' | 'liter' | 'meter' | 'box';
  minStock: number;
  reorderPoint: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input type for creating a new product
 */
export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input type for updating a product
 */
export type UpdateProductInput = Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>;

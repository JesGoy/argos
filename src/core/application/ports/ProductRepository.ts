import type { Product, CreateProductInput, UpdateProductInput } from '@/core/domain/entities/Product';

/**
 * Product Repository Port
 * Contract for product data access operations
 */
export interface ProductRepository {
  /**
   * Find a product by its ID
   */
  findById(id: string): Promise<Product | null>;

  /**
   * Find a product by its SKU
   */
  findBySku(sku: string): Promise<Product | null>;

  /**
   * Find all products
   * @param filters Optional filters (category, search term) and pagination (limit/offset)
   */
  findAll(filters?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]>;

  /**
   * Count products matching the given filters (ignores pagination).
   */
  count(filters?: { category?: string; search?: string }): Promise<number>;

  /**
   * Count products currently at or below their reorder point.
   */
  countLowStock(): Promise<number>;

  /**
   * Count distinct product categories in the organization.
   */
  countCategories(): Promise<number>;

  /**
   * Find products with low stock (below reorder point)
   */
  findLowStock(): Promise<Product[]>;

  /**
   * Create a new product
   */
  create(input: CreateProductInput): Promise<Product>;

  /**
   * Update an existing product
   */
  update(id: string, input: UpdateProductInput): Promise<void>;

  /**
   * Delete a product by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a product exists by ID
   */
  exists(id: string): Promise<boolean>;
}

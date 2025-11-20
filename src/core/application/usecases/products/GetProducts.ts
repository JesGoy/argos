import type { Product } from '@/core/domain/entities/Product';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';

/**
 * Use Case: Get Products
 * Retrieves all products with optional filtering
 */
export class GetProducts {
  constructor(
    private readonly deps: {
      products: ProductRepository;
    }
  ) {}

  async execute(filters?: { category?: string; search?: string }): Promise<Product[]> {
    return await this.deps.products.findAll(filters);
  }
}

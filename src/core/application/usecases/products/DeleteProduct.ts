import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';

/**
 * Use Case: Delete Product
 * Deletes a product from the inventory system
 */
export class DeleteProduct {
  constructor(
    private readonly deps: {
      products: ProductRepository;
    }
  ) {}

  async execute(id: string): Promise<void> {
    // Check if product exists
    const exists = await this.deps.products.exists(id);
    if (!exists) {
      throw new ProductNotFoundError(id);
    }

    // Delete the product
    await this.deps.products.delete(id);
  }
}

import type { UpdateProductInput } from '@/core/domain/entities/Product';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import { ProductNotFoundError, DuplicateSKUError } from '@/core/domain/errors/ProductErrors';

/**
 * Use Case: Update Product
 * Updates an existing product's information
 */
export class UpdateProduct {
  constructor(
    private readonly deps: {
      products: ProductRepository;
    }
  ) {}

  async execute(id: string, input: UpdateProductInput): Promise<void> {
    // Check if product exists
    const exists = await this.deps.products.exists(id);
    if (!exists) {
      throw new ProductNotFoundError(id);
    }

    // If updating SKU, check for duplicates
    if (input.sku) {
      const existingProduct = await this.deps.products.findBySku(input.sku);
      if (existingProduct && existingProduct.id !== id) {
        throw new DuplicateSKUError(input.sku);
      }
    }

    // Update the product
    await this.deps.products.update(id, input);
  }
}

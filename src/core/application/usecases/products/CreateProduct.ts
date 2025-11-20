import type { Product, CreateProductInput } from '@/core/domain/entities/Product';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import { DuplicateSKUError } from '@/core/domain/errors/ProductErrors';

/**
 * Use Case: Create Product
 * Creates a new product in the inventory system
 */
export class CreateProduct {
  constructor(
    private readonly deps: {
      products: ProductRepository;
    }
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    // Check if SKU already exists
    const existingProduct = await this.deps.products.findBySku(input.sku);
    if (existingProduct) {
      throw new DuplicateSKUError(input.sku);
    }

    // Create the product
    return await this.deps.products.create(input);
  }
}

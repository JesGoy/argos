import type { Product } from '@/core/domain/entities/Product';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';

/**
 * Use Case: Get Product By ID
 * Retrieves a specific product by its ID
 */
export class GetProductById {
  constructor(
    private readonly deps: {
      products: ProductRepository;
    }
  ) {}

  async execute(id: string): Promise<Product> {
    const product = await this.deps.products.findById(id);
    
    if (!product) {
      throw new ProductNotFoundError(id);
    }

    return product;
  }
}

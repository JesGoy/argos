import type { ProductWithStock } from '@/core/domain/entities/Product';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';

/**
 * Use Case: Get Products With Stock
 * Retrieves products (optionally filtered) enriched with their live stock level,
 * computed from StockTransaction sums via a single batch query (no N+1).
 */
export class GetProductsWithStock {
  constructor(
    private readonly deps: {
      products: ProductRepository;
      stockTransactions: StockTransactionRepository;
    }
  ) {}

  async execute(filters?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProductWithStock[]> {
    const products = await this.deps.products.findAll(filters);
    if (products.length === 0) return [];

    const stockByProductId = await this.deps.stockTransactions.getCurrentStockBatch(
      products.map((product) => product.id)
    );

    return products.map((product) => ({
      ...product,
      currentStock: stockByProductId[product.id] ?? 0,
    }));
  }
}

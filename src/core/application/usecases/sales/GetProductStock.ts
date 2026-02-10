import type { Product } from '@/core/domain/entities/Product';
import type { StockTransaction } from '@/core/domain/entities/StockTransaction';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';

export interface ProductStockInfo {
  product: Product;
  currentStock: number;
  isLowStock: boolean;
  recentTransactions: StockTransaction[];
}

/**
 * Use Case: Get Product Stock
 * Retrieves current stock information for a product
 */
export class GetProductStock {
  constructor(
    private readonly deps: {
      products: ProductRepository;
      stockTransactions: StockTransactionRepository;
    }
  ) {}

  async execute(productId: string): Promise<ProductStockInfo> {
    // Get product
    const product = await this.deps.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    // Get current stock
    const currentStock = await this.deps.stockTransactions.getCurrentStock(productId);

    // Get recent transactions (last 10)
    const allTransactions = await this.deps.stockTransactions.findByProductId(productId);
    const recentTransactions = allTransactions.slice(-10);

    // Check if stock is low
    const isLowStock = currentStock <= product.reorderPoint;

    return {
      product,
      currentStock,
      isLowStock,
      recentTransactions,
    };
  }
}

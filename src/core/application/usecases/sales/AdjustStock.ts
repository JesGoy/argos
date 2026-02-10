import type { StockTransaction, CreateStockTransactionInput } from '@/core/domain/entities/StockTransaction';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { TransactionType } from '@/core/domain/constants/StockConstants';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';
import { InvalidSaleDataError } from '@/core/domain/errors/POSErrors';

export interface AdjustStockInput {
  productId: string;
  type: TransactionType;
  quantity: number;
  reason: string;
  userId: number;
  referenceNumber?: string;
}

/**
 * Use Case: Adjust Stock
 * Manually adjusts product stock (purchases, corrections, returns)
 */
export class AdjustStock {
  constructor(
    private readonly deps: {
      products: ProductRepository;
      stockTransactions: StockTransactionRepository;
    }
  ) {}

  async execute(input: AdjustStockInput): Promise<StockTransaction> {
    // Validate product exists
    const product = await this.deps.products.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    // Validate quantity
    if (input.quantity === 0) {
      throw new InvalidSaleDataError('La cantidad no puede ser cero');
    }

    // For adjustments that reduce stock, check if enough stock is available
    if (input.quantity < 0) {
      const currentStock = await this.deps.stockTransactions.getCurrentStock(input.productId);
      if (currentStock + input.quantity < 0) {
        throw new InvalidSaleDataError(
          `Stock insuficiente. Stock actual: ${currentStock}, ajuste solicitado: ${input.quantity}`
        );
      }
    }

    // Create stock transaction
    const transactionInput: CreateStockTransactionInput = {
      productId: input.productId,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      userId: input.userId,
      referenceNumber: input.referenceNumber,
    };

    return await this.deps.stockTransactions.create(transactionInput);
  }
}

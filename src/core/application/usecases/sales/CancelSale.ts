import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type { StockTransactionRepository } from '@/core/application/ports/StockTransactionRepository';
import { SALE_STATUS } from '@/core/domain/constants/SaleConstants';
import { TRANSACTION_TYPE } from '@/core/domain/constants/StockConstants';
import { SaleNotFoundError, SaleAlreadyCompletedError } from '@/core/domain/errors/POSErrors';

/**
 * Use Case: Cancel Sale
 * Cancels a sale and restores inventory
 */
export class CancelSale {
  constructor(
    private readonly deps: {
      sales: SaleRepository;
      saleItems: SaleItemRepository;
      stockTransactions: StockTransactionRepository;
    }
  ) {}

  async execute(saleId: string, userId: number): Promise<void> {
    // Get sale
    const sale = await this.deps.sales.findById(saleId);
    if (!sale) {
      throw new SaleNotFoundError(saleId);
    }

    // Check if already cancelled
    if (sale.status === SALE_STATUS.CANCELLED) {
      throw new SaleAlreadyCompletedError(sale.saleNumber);
    }

    // Get sale items to reverse stock
    const items = await this.deps.saleItems.findBySaleId(saleId);

    // Create reverse stock transactions
    const reverseTransactions = items.map((item) => ({
      productId: item.productId,
      type: TRANSACTION_TYPE.RETURN,
      quantity: item.quantity, // Positive to add back
      reason: `Cancelación de venta ${sale.saleNumber}`,
      userId,
      saleId: sale.id,
    }));

    await this.deps.stockTransactions.createBatch(reverseTransactions);

    // Cancel the sale
    await this.deps.sales.cancel(saleId);
  }
}

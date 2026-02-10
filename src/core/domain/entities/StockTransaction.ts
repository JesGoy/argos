import type { TransactionType } from '@/core/domain/constants/StockConstants';

/**
 * StockTransaction Domain Entity
 * Represents a stock movement (sale, purchase, adjustment)
 */
export interface StockTransaction {
  id: string;
  productId: string;
  type: TransactionType;
  quantity: number;
  reason: string;
  userId: number;
  saleId?: string;
  referenceNumber?: string;
  createdAt: Date;
}

/**
 * Input type for creating a stock transaction
 */
export type CreateStockTransactionInput = Omit<StockTransaction, 'id' | 'createdAt'>;

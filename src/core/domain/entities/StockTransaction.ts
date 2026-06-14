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
  /** Categorized merma reason (only set when type === 'waste'). */
  wasteReason?: string;
  userId: number;
  saleId?: string;
  /** Proveedor (only set when type === 'purchase'). */
  supplierId?: string;
  /** Per-unit acquisition cost in cents at time of purchase (purchases only). */
  perUnitCost?: number;
  referenceNumber?: string;
  createdAt: Date;
}

/**
 * Input type for creating a stock transaction
 */
export type CreateStockTransactionInput = Omit<StockTransaction, 'id' | 'createdAt'>;

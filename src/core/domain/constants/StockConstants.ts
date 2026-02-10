/**
 * Stock Transaction Domain Constants
 * Single source of truth for stock transaction values
 */

/**
 * All available transaction types
 */
export const TRANSACTION_TYPES = ['sale', 'purchase', 'adjustment', 'return'] as const;

/**
 * Type representing any valid transaction type
 */
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Transaction type constants for use in code
 */
export const TRANSACTION_TYPE = {
  SALE: 'sale' as const,
  PURCHASE: 'purchase' as const,
  ADJUSTMENT: 'adjustment' as const,
  RETURN: 'return' as const,
} as const;

/**
 * Transaction type labels for UI display
 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  return: 'Devolución',
} as const;

/**
 * Determines if transaction type increases stock
 */
export const INCREASES_STOCK: Record<TransactionType, boolean> = {
  sale: false,
  purchase: true,
  adjustment: true, // Can be positive or negative based on quantity sign
  return: true,
} as const;

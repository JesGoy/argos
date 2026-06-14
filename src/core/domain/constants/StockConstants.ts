/**
 * Stock Transaction Domain Constants
 * Single source of truth for stock transaction values
 */

/**
 * All available transaction types
 */
export const TRANSACTION_TYPES = ['sale', 'purchase', 'adjustment', 'return', 'waste'] as const;

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
  WASTE: 'waste' as const,
} as const;

/**
 * Transaction type labels for UI display
 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  return: 'Devolución',
  waste: 'Merma',
} as const;

/**
 * Determines if transaction type increases stock
 */
export const INCREASES_STOCK: Record<TransactionType, boolean> = {
  sale: false,
  purchase: true,
  adjustment: true, // Can be positive or negative based on quantity sign
  return: true,
  waste: false, // Waste always decreases stock
} as const;

/**
 * Merma (waste) reason categories — why product was lost/discarded.
 */
export const WASTE_REASONS = ['expired', 'damaged', 'prep_loss', 'theft', 'other'] as const;

export type WasteReason = (typeof WASTE_REASONS)[number];

export const WASTE_REASON = {
  EXPIRED: 'expired' as const,
  DAMAGED: 'damaged' as const,
  PREP_LOSS: 'prep_loss' as const,
  THEFT: 'theft' as const,
  OTHER: 'other' as const,
} as const;

export const WASTE_REASON_LABELS: Record<WasteReason, string> = {
  expired: 'Vencido / caducado',
  damaged: 'Dañado',
  prep_loss: 'Pérdida en preparación',
  theft: 'Robo / faltante',
  other: 'Otro',
} as const;

/**
 * AI action identifiers for stock operations
 */
export const STOCK_AI_ACTION = {
  STOCK_IN: 'register_stock_in' as const,
  STOCK_OUT: 'register_stock_out' as const,
  RECORD_WASTE: 'register_waste' as const,
  GET_HISTORY: 'get_stock_history' as const,
} as const;

export type StockAIAction = (typeof STOCK_AI_ACTION)[keyof typeof STOCK_AI_ACTION];

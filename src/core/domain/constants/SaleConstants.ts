/**
 * Sale Domain Constants
 * Single source of truth for sale-related values
 */

/**
 * All available payment methods
 */
export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'mixed'] as const;

/**
 * Type representing any valid payment method
 */
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Payment method constants for use in code
 */
export const PAYMENT_METHOD = {
  CASH: 'cash' as const,
  CARD: 'card' as const,
  TRANSFER: 'transfer' as const,
  MIXED: 'mixed' as const,
} as const;

/**
 * Payment method labels for UI display
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Mixto',
} as const;

/**
 * All available sale statuses
 */
export const SALE_STATUSES = ['pending', 'completed', 'cancelled'] as const;

/**
 * Type representing any valid sale status
 */
export type SaleStatus = (typeof SALE_STATUSES)[number];

/**
 * Sale status constants for use in code
 */
export const SALE_STATUS = {
  PENDING: 'pending' as const,
  COMPLETED: 'completed' as const,
  CANCELLED: 'cancelled' as const,
} as const;

/**
 * Sale status labels for UI display
 */
export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
} as const;

/**
 * Sale status colors for UI display
 */
export const SALE_STATUS_COLORS: Record<SaleStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
} as const;

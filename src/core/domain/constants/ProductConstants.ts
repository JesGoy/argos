/**
 * Product Domain Constants
 * Single source of truth for product-related values
 */

/**
 * All available product units
 */
export const PRODUCT_UNITS = ['pcs', 'kg', 'liter', 'meter', 'box'] as const;

/**
 * Type representing any valid product unit
 */
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

/**
 * Product unit constants for use in code
 */
export const PRODUCT_UNIT = {
  PIECES: 'pcs' as const,
  KILOGRAM: 'kg' as const,
  LITER: 'liter' as const,
  METER: 'meter' as const,
  BOX: 'box' as const,
} as const;

/**
 * Product unit labels for UI display
 */
export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  pcs: 'Piezas',
  kg: 'Kilogramos',
  liter: 'Litros',
  meter: 'Metros',
  box: 'Cajas',
} as const;

/**
 * Product unit abbreviations for compact display
 */
export const PRODUCT_UNIT_ABBR: Record<ProductUnit, string> = {
  pcs: 'pzs',
  kg: 'kg',
  liter: 'L',
  meter: 'm',
  box: 'cjs',
} as const;

/**
 * Default values for product creation
 */
export const PRODUCT_DEFAULTS = {
  MIN_STOCK: 0,
  REORDER_POINT: 10,
  CURRENT_STOCK: 0,
} as const;

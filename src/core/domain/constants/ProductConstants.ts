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
} as const;

export const PRODUCT_COMMAND_SOURCE = {
  MANUAL: 'manual' as const,
  AI: 'ai' as const,
} as const;

export type ProductCommandSource =
  (typeof PRODUCT_COMMAND_SOURCE)[keyof typeof PRODUCT_COMMAND_SOURCE];

export const PRODUCT_COMMAND_ACTION = {
  CREATE: 'create' as const,
  UPDATE: 'update' as const,
  DELETE: 'delete' as const,
  GET: 'get' as const,
  LIST: 'list' as const,
  SEARCH: 'search' as const,
  CHECK_STOCK: 'check_stock' as const,
  GET_LOW_STOCK: 'get_low_stock' as const,
} as const;

export type ProductCommandAction =
  (typeof PRODUCT_COMMAND_ACTION)[keyof typeof PRODUCT_COMMAND_ACTION];

export const PRODUCT_AI_ACTION = {
  CREATE: 'create_product' as const,
  UPDATE: 'update_product' as const,
  DELETE: 'delete_product' as const,
  GET: 'get_product' as const,
  LIST: 'list_products' as const,
  SEARCH_BY_NAME: 'search_product_by_name' as const,
  CHECK_STOCK: 'check_stock' as const,
  GET_LOW_STOCK: 'get_low_stock_products' as const,
} as const;

export type ProductAIAction =
  (typeof PRODUCT_AI_ACTION)[keyof typeof PRODUCT_AI_ACTION];

export const PRODUCT_CONFIRMATION = {
  DELETE_PENDING_ACTION: PRODUCT_AI_ACTION.DELETE,
} as const;


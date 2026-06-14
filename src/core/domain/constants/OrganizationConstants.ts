/**
 * Organization Domain Constants
 * Single source of truth for tenant-level values.
 */

/**
 * Business types Argos adapts to. Drives which features are surfaced
 * (e.g. merma/recetas only for food_service).
 */
export const BUSINESS_TYPES = ['food_service', 'retail'] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE = {
  FOOD_SERVICE: 'food_service' as const,
  RETAIL: 'retail' as const,
} as const;

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  food_service: 'Cafetería / Comida',
  retail: 'Retail / General',
} as const;

/**
 * Defaults for newly created organizations (editable later in Settings).
 */
export const ORGANIZATION_DEFAULTS = {
  BUSINESS_TYPE: BUSINESS_TYPE.FOOD_SERVICE,
  CURRENCY: 'CLP',
  TIMEZONE: 'America/Santiago',
} as const;

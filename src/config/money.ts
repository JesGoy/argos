import { ORGANIZATION_DEFAULTS } from '@/core/domain/constants/OrganizationConstants';

/**
 * Money is stored across the domain as an integer number of minor units
 * ("cents"): Sale.totalAmount, SaleItem.unitPrice/subtotal and
 * Product.unitCost/sellingPrice are all integer cents.
 *
 * Forms collect amounts in major units (e.g. 15.50) and convert with `toCents`
 * at the validation boundary; views render with `formatMoney`, passing the
 * organization's ISO 4217 currency so a multi-tenant install shows each org its
 * own currency (CLP renders with no decimals, USD with two, etc.).
 */
export const MONEY = {
  MINOR_UNITS_PER_MAJOR: 100,
} as const;

/** Locale for grouping/decimal separators when a caller doesn't supply one. */
export const DEFAULT_LOCALE = 'es-CL';

export function toCents(majorAmount: number): number {
  return Math.round(majorAmount * MONEY.MINOR_UNITS_PER_MAJOR);
}

export function fromCents(cents: number): number {
  return cents / MONEY.MINOR_UNITS_PER_MAJOR;
}

/**
 * Format integer cents as a localized currency string.
 *
 * @param cents    amount in minor units
 * @param currency ISO 4217 code (e.g. 'CLP', 'USD'); defaults to the org default
 * @param locale   BCP 47 locale for separators; defaults to `DEFAULT_LOCALE`
 *
 * Falls back to `"<CODE> <number>"` if `currency` is not a valid ISO code, so a
 * bad value degrades gracefully instead of throwing in a render.
 */
export function formatMoney(
  cents: number,
  currency: string = ORGANIZATION_DEFAULTS.CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  const major = fromCents(cents);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

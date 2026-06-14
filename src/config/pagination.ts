/**
 * Pagination defaults and helpers for list views.
 */
export const PAGE_SIZE = 20;

/**
 * Parse a 1-based page number from a raw search-param value, clamped to >= 1.
 */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number(value);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

/**
 * Convert a 1-based page to { limit, offset } for a repository query.
 */
export function toLimitOffset(page: number, pageSize: number = PAGE_SIZE): {
  limit: number;
  offset: number;
} {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

/**
 * Total number of pages for a given row count.
 */
export function totalPages(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

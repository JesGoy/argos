/**
 * User Domain Constants
 * Single source of truth for user-related values
 */

/**
 * All available user roles in the system
 */
export const USER_ROLES = ['admin', 'warehouse_manager', 'operator', 'viewer'] as const;

/**
 * Type representing any valid user role
 */
export type UserRole = (typeof USER_ROLES)[number];

/**
 * User role constants for use in code
 * Prevents typos and enables IDE autocomplete
 */
export const USER_ROLE = {
  ADMIN: 'admin' as const,
  WAREHOUSE_MANAGER: 'warehouse_manager' as const,
  OPERATOR: 'operator' as const,
  VIEWER: 'viewer' as const,
} as const;

/**
 * Role permission levels (for hierarchical checks)
 */
export const ROLE_LEVELS = {
  [USER_ROLE.VIEWER]: 1,
  [USER_ROLE.OPERATOR]: 2,
  [USER_ROLE.WAREHOUSE_MANAGER]: 3,
  [USER_ROLE.ADMIN]: 4,
} as const;

/**
 * Roles that can perform sales operations
 */
export const SALES_AUTHORIZED_ROLES: readonly UserRole[] = [
  USER_ROLE.ADMIN,
  USER_ROLE.WAREHOUSE_MANAGER,
  USER_ROLE.OPERATOR,
] as const;

/**
 * Roles that can manage products
 */
export const PRODUCT_MANAGEMENT_ROLES: readonly UserRole[] = [
  USER_ROLE.ADMIN,
  USER_ROLE.WAREHOUSE_MANAGER,
  USER_ROLE.OPERATOR,
] as const;

/**
 * Roles that can view reports
 */
export const REPORT_VIEWER_ROLES: readonly UserRole[] = [
  USER_ROLE.ADMIN,
  USER_ROLE.WAREHOUSE_MANAGER,
] as const;

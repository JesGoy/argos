/**
 * Billing Domain Constants
 * Single source of truth for plan tiers, statuses and per-plan limits.
 */

export const PLAN_TYPES = ['free', 'pro', 'business'] as const;

export type PlanType = (typeof PLAN_TYPES)[number];

export const PLAN_TYPE = {
  FREE: 'free' as const,
  PRO: 'pro' as const,
  BUSINESS: 'business' as const,
} as const;

export const PLAN_LABELS: Record<PlanType, string> = {
  free: 'Gratis',
  pro: 'Pro',
  business: 'Business',
} as const;

export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'cancelled', 'trialing'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active' as const,
  PAST_DUE: 'past_due' as const,
  CANCELLED: 'cancelled' as const,
  TRIALING: 'trialing' as const,
} as const;

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Activa',
  past_due: 'Pago pendiente',
  cancelled: 'Cancelada',
  trialing: 'Periodo de prueba',
} as const;

export type PlanLimitType = 'users' | 'products' | 'aiCalls';

export interface PlanLimits {
  users: number;
  products: number;
  aiCallsPerMonth: number;
}

/**
 * Hard caps per plan. `Number.POSITIVE_INFINITY` represents an unlimited tier
 * (Business) — all comparisons (`current >= max`) naturally return false.
 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: { users: 1, products: 50, aiCallsPerMonth: 100 },
  pro: { users: 5, products: 500, aiCallsPerMonth: 2000 },
  business: {
    users: Number.POSITIVE_INFINITY,
    products: Number.POSITIVE_INFINITY,
    aiCallsPerMonth: Number.POSITIVE_INFINITY,
  },
} as const;

/**
 * Display copy in USD for the upgrade UI. Real money lives in the billing
 * provider when Stripe is wired — this is purely presentational for the stub.
 */
export const PLAN_PRICE_USD: Record<PlanType, number> = {
  free: 0,
  pro: 29,
  business: 99,
} as const;

export const PLAN_LIMIT_LABEL: Record<PlanLimitType, string> = {
  users: 'usuarios',
  products: 'productos',
  aiCalls: 'mensajes al asistente IA',
} as const;

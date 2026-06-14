/**
 * Auth-related security constants. Centralized here so policies (rate limits,
 * cookie behavior, etc.) can be tuned in one place.
 */

export const AUTH_RATE_LIMIT = {
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 min
  REGISTER_MAX_ATTEMPTS: 3,
  REGISTER_WINDOW_MS: 60 * 60 * 1000, // 1h
} as const;

export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

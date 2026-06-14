import type { SessionData } from '@/core/application/ports/SessionService';
import type { PlanType } from '@/core/domain/constants/BillingConstants';
import type { Subscription } from '@/core/domain/entities/Subscription';

export type CheckoutSessionResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'stubbed'; subscription: Subscription };

/**
 * Abstracts the billing backend. Today it's a stub that flips plans
 * immediately; tomorrow a `StripeBillingProvider` will return real Checkout
 * URLs. Domain code, use cases and UI never import a concrete provider — they
 * depend only on this port so swapping vendors is a one-line container change.
 */
export interface BillingProvider {
  createCheckoutSession(input: {
    session: SessionData;
    targetPlan: PlanType;
  }): Promise<CheckoutSessionResult>;

  cancelSubscription(input: { session: SessionData }): Promise<Subscription>;

  /**
   * Reconcile local state with the provider's source of truth. Stripe webhook
   * handlers will call this; the stub is a no-op.
   */
  syncFromProvider(organizationId: number): Promise<void>;
}

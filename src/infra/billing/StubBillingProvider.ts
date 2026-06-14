import type {
  BillingProvider,
  CheckoutSessionResult,
} from '@/core/application/ports/BillingProvider';
import type { SessionData } from '@/core/application/ports/SessionService';
import { PLAN_TYPE, type PlanType } from '@/core/domain/constants/BillingConstants';
import type { Subscription } from '@/core/domain/entities/Subscription';
import type { ChangePlan } from '@/core/application/usecases/billing/ChangePlan';

/**
 * Local-only billing provider for the MVP. Flips the org's plan immediately
 * via `ChangePlan` — no payment, no external call. Returns `{kind:'stubbed'}`
 * so the UI can show a "demo mode" toast instead of redirecting.
 *
 * Replaced by `StripeBillingProvider` once a payment method is decided; the
 * port stays identical so nothing else changes.
 */
export class StubBillingProvider implements BillingProvider {
  constructor(private readonly changePlan: ChangePlan) {}

  async createCheckoutSession(input: {
    session: SessionData;
    targetPlan: PlanType;
  }): Promise<CheckoutSessionResult> {
    const subscription = await this.changePlan.execute({
      session: input.session,
      targetPlan: input.targetPlan,
    });
    return { kind: 'stubbed', subscription };
  }

  async cancelSubscription(input: { session: SessionData }): Promise<Subscription> {
    return this.changePlan.execute({
      session: input.session,
      targetPlan: PLAN_TYPE.FREE,
    });
  }

  async syncFromProvider(_organizationId: number): Promise<void> {
    // No external state to reconcile in stub mode.
  }
}

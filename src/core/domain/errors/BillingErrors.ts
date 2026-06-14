import type {
  PlanLimitType,
  PlanType,
} from '@/core/domain/constants/BillingConstants';
import { PLAN_LABELS, PLAN_LIMIT_LABEL } from '@/core/domain/constants/BillingConstants';

/**
 * Domain Error: Plan limit exceeded
 *
 * Thrown when a mutation would push the organization past its plan cap
 * (users / products / AI calls). Carries the structured limit info so the UI
 * can render a targeted upgrade CTA without parsing the message.
 */
export class PlanLimitExceededError extends Error {
  constructor(
    public readonly limitType: PlanLimitType,
    public readonly current: number,
    public readonly max: number,
    public readonly plan: PlanType
  ) {
    super(
      `Has alcanzado el límite de ${PLAN_LIMIT_LABEL[limitType]} de tu plan ${PLAN_LABELS[plan]} (${current}/${max}).`
    );
    this.name = 'PlanLimitExceededError';
  }
}

/**
 * Domain Error: Subscription not found
 */
export class SubscriptionNotFoundError extends Error {
  constructor(organizationId: number | string) {
    super(`Suscripción no encontrada para la organización: ${organizationId}`);
    this.name = 'SubscriptionNotFoundError';
  }
}

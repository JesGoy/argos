import type { ProductRepository } from '@/core/application/ports/ProductRepository';
import type { SessionData } from '@/core/application/ports/SessionService';
import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import {
  PLAN_LIMITS,
  type PlanLimitType,
  type PlanType,
} from '@/core/domain/constants/BillingConstants';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import type { Subscription } from '@/core/domain/entities/Subscription';
import { PlanLimitExceededError } from '@/core/domain/errors/BillingErrors';
import { AuthorizeRole } from '../auth/AuthorizeRole';
import { GetSubscription } from './GetSubscription';

export interface ChangePlanInput {
  session: SessionData;
  targetPlan: PlanType;
}

/**
 * Admin-only plan change. Updates `plan` only — period window and AI counter
 * are preserved so a mid-period upgrade/downgrade doesn't grant a free reset.
 *
 * Refuses downgrades whose caps are already exceeded by current usage. The
 * thrown `PlanLimitExceededError` carries `limitType` so the UI can tell the
 * admin exactly which resource is over budget.
 */
export class ChangePlan {
  private readonly authorize = new AuthorizeRole();

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly getSubscription: GetSubscription,
    private readonly users: UserRepository,
    private readonly products: ProductRepository,
  ) {}

  async execute(input: ChangePlanInput): Promise<Subscription> {
    this.authorize.execute({ session: input.session, allowedRoles: [USER_ROLE.ADMIN] });

    const orgId = input.session.organizationId;
    const current = await this.getSubscription.execute(orgId);

    if (current.plan === input.targetPlan) return current;

    const targetLimits = PLAN_LIMITS[input.targetPlan];

    const [orgUsers, productCount] = await Promise.all([
      this.users.findByOrganization(orgId),
      this.products.count(),
    ]);

    const usage: Record<PlanLimitType, number> = {
      users: orgUsers.length,
      products: productCount,
      aiCalls: current.aiCallsUsedThisPeriod,
    };

    const caps: Record<PlanLimitType, number> = {
      users: targetLimits.users,
      products: targetLimits.products,
      aiCalls: targetLimits.aiCallsPerMonth,
    };

    for (const limitType of ['users', 'products', 'aiCalls'] as const) {
      if (usage[limitType] > caps[limitType]) {
        throw new PlanLimitExceededError(
          limitType,
          usage[limitType],
          caps[limitType],
          input.targetPlan,
        );
      }
    }

    return this.subscriptions.update(orgId, { plan: input.targetPlan });
  }
}

import type { BillingProvider } from '@/core/application/ports/BillingProvider';
import { ChangePlan } from '@/core/application/usecases/billing/ChangePlan';
import { EnforcePlanLimit } from '@/core/application/usecases/billing/EnforcePlanLimit';
import { EnsureSubscription } from '@/core/application/usecases/billing/EnsureSubscription';
import { GetSubscription } from '@/core/application/usecases/billing/GetSubscription';
import { RecordAiUsage } from '@/core/application/usecases/billing/RecordAiUsage';
import { StubBillingProvider } from '@/infra/billing/StubBillingProvider';
import { ProductRepositoryDrizzle } from '@/infra/repositories/ProductRepositoryDrizzle';
import { SubscriptionRepositoryDrizzle } from '@/infra/repositories/SubscriptionRepositoryDrizzle';
import { UserRepositoryDrizzle } from '@/infra/repositories/UserRepositoryDrizzle';

/**
 * Subscription repo is stateless and tenant-agnostic (every method takes
 * `organizationId`), so a module-level singleton is fine and avoids creating
 * a new instance per server action.
 */
let subscriptionRepoSingleton: SubscriptionRepositoryDrizzle | null = null;
function subscriptions(): SubscriptionRepositoryDrizzle {
  if (!subscriptionRepoSingleton) {
    subscriptionRepoSingleton = new SubscriptionRepositoryDrizzle();
  }
  return subscriptionRepoSingleton;
}

export function makeEnsureSubscription(): EnsureSubscription {
  return new EnsureSubscription(subscriptions());
}

export function makeGetSubscription(): GetSubscription {
  return new GetSubscription(subscriptions(), makeEnsureSubscription());
}

export function makeEnforcePlanLimit(): EnforcePlanLimit {
  return new EnforcePlanLimit();
}

export function makeRecordAiUsage(): RecordAiUsage {
  return new RecordAiUsage(subscriptions());
}

export function makeChangePlan(organizationId: number): ChangePlan {
  return new ChangePlan(
    subscriptions(),
    makeGetSubscription(),
    new UserRepositoryDrizzle(),
    new ProductRepositoryDrizzle(organizationId),
  );
}

/**
 * Swap to `StripeBillingProvider` once a payment method is integrated; no
 * other code depends on the concrete class.
 */
export function makeBillingProvider(organizationId: number): BillingProvider {
  return new StubBillingProvider(makeChangePlan(organizationId));
}

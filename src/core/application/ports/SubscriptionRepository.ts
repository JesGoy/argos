import type {
  Subscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from '@/core/domain/entities/Subscription';

/**
 * Subscription Repository Port
 *
 * Org-scoped via the unique `organizationId` column (1:1 with Organization).
 */
export interface SubscriptionRepository {
  findByOrganizationId(organizationId: number): Promise<Subscription | null>;
  create(input: CreateSubscriptionInput): Promise<Subscription>;
  update(organizationId: number, patch: UpdateSubscriptionInput): Promise<Subscription>;
  /**
   * Atomic counter bump for AI usage. Returns the post-increment row so the
   * caller can render fresh remaining-quota numbers without a re-read.
   */
  incrementAiCalls(organizationId: number, delta: number): Promise<Subscription>;
}

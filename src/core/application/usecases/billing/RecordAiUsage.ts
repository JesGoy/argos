import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type { Subscription } from '@/core/domain/entities/Subscription';

/**
 * Atomic post-success increment of the AI-call counter. Invoked by
 * ProcessAICommand once the assistant message is persisted, so failed turns
 * (model error, validation) don't burn quota. Confirmation replies skip this
 * helper since they don't hit the model.
 */
export class RecordAiUsage {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async execute(organizationId: number, delta = 1): Promise<Subscription> {
    return this.subscriptions.incrementAiCalls(organizationId, delta);
  }
}

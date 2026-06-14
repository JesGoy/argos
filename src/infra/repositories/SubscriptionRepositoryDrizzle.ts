import { eq, sql } from 'drizzle-orm';
import type {
  Subscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
} from '@/core/domain/entities/Subscription';
import type { SubscriptionRepository } from '@/core/application/ports/SubscriptionRepository';
import type {
  PlanType,
  SubscriptionStatus,
} from '@/core/domain/constants/BillingConstants';
import { SubscriptionNotFoundError } from '@/core/domain/errors/BillingErrors';
import { getDb } from '@/infra/db/client';
import { subscriptionTable, type SubscriptionRow } from '@/infra/db/schema';

export class SubscriptionRepositoryDrizzle implements SubscriptionRepository {
  private mapToEntity(row: SubscriptionRow): Subscription {
    return {
      id: row.id,
      organizationId: row.organizationId,
      plan: row.plan as PlanType,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      aiCallsUsedThisPeriod: row.aiCallsUsedThisPeriod,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findByOrganizationId(organizationId: number): Promise<Subscription | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(subscriptionTable)
      .where(eq(subscriptionTable.organizationId, organizationId))
      .limit(1);
    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async create(input: CreateSubscriptionInput): Promise<Subscription> {
    const db = getDb();
    const [row] = await db
      .insert(subscriptionTable)
      .values({
        organizationId: input.organizationId,
        plan: input.plan,
        status: input.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .returning();
    return this.mapToEntity(row);
  }

  async update(
    organizationId: number,
    patch: UpdateSubscriptionInput
  ): Promise<Subscription> {
    const db = getDb();
    const [row] = await db
      .update(subscriptionTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(subscriptionTable.organizationId, organizationId))
      .returning();
    if (!row) throw new SubscriptionNotFoundError(organizationId);
    return this.mapToEntity(row);
  }

  async incrementAiCalls(
    organizationId: number,
    delta: number
  ): Promise<Subscription> {
    const db = getDb();
    const [row] = await db
      .update(subscriptionTable)
      .set({
        aiCallsUsedThisPeriod: sql`${subscriptionTable.aiCallsUsedThisPeriod} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(eq(subscriptionTable.organizationId, organizationId))
      .returning();
    if (!row) throw new SubscriptionNotFoundError(organizationId);
    return this.mapToEntity(row);
  }
}

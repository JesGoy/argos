import { eq } from 'drizzle-orm';
import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@/core/domain/entities/Organization';
import type { OrganizationRepository } from '@/core/application/ports/OrganizationRepository';
import { ORGANIZATION_DEFAULTS } from '@/core/domain/constants/OrganizationConstants';
import { getDb, type DbExecutor } from '@/infra/db/client';
import { organizationTable, type OrganizationRow } from '@/infra/db/schema';

/**
 * Drizzle implementation of OrganizationRepository.
 * Not org-scoped (it is the tenant table itself).
 */
export class OrganizationRepositoryDrizzle implements OrganizationRepository {
  private mapToEntity(row: OrganizationRow): Organization {
    return {
      id: String(row.id),
      name: row.name,
      businessType: row.businessType,
      currency: row.currency,
      timezone: row.timezone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: string): Promise<Organization | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(organizationTable)
      .where(eq(organizationTable.id, parseInt(id, 10)))
      .limit(1);

    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async create(input: CreateOrganizationInput, executor?: unknown): Promise<Organization> {
    const db = (executor as DbExecutor) ?? getDb();
    const [row] = await db
      .insert(organizationTable)
      .values({
        name: input.name,
        businessType: input.businessType ?? ORGANIZATION_DEFAULTS.BUSINESS_TYPE,
        currency: input.currency ?? ORGANIZATION_DEFAULTS.CURRENCY,
        timezone: input.timezone ?? ORGANIZATION_DEFAULTS.TIMEZONE,
        updatedAt: new Date(),
      })
      .returning();

    return this.mapToEntity(row);
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<void> {
    const db = getDb();
    await db
      .update(organizationTable)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(organizationTable.id, parseInt(id, 10)));
  }
}

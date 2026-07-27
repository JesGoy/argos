import { eq } from 'drizzle-orm';
import type {
  DteConfig,
  CreateDteConfigInput,
  UpdateDteConfigInput,
} from '@/core/domain/entities/DteConfig';
import type { DteConfigRepository } from '@/core/application/ports/DteConfigRepository';
import type { DteEnvironment, DteProviderName } from '@/core/domain/constants/DteConstants';
import { DteConfigNotFoundError } from '@/core/domain/errors/DteErrors';
import { getDb } from '@/infra/db/client';
import { dteConfigTable, type DteConfigRow } from '@/infra/db/schema';

export class DteConfigRepositoryDrizzle implements DteConfigRepository {
  private mapToEntity(row: DteConfigRow): DteConfig {
    return {
      id: row.id,
      organizationId: row.organizationId,
      enabled: row.enabled,
      provider: row.provider as DteProviderName,
      environment: row.environment as DteEnvironment,
      apiKeyEncrypted: row.apiKeyEncrypted ?? undefined,
      rutEmisor: row.rutEmisor ?? undefined,
      razonSocial: row.razonSocial ?? undefined,
      giro: row.giro ?? undefined,
      acteco: row.acteco ?? undefined,
      direccion: row.direccion ?? undefined,
      comuna: row.comuna ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findByOrganizationId(organizationId: number): Promise<DteConfig | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(dteConfigTable)
      .where(eq(dteConfigTable.organizationId, organizationId))
      .limit(1);
    const row = rows[0];
    return row ? this.mapToEntity(row) : null;
  }

  async create(input: CreateDteConfigInput): Promise<DteConfig> {
    const db = getDb();
    const [row] = await db
      .insert(dteConfigTable)
      .values({
        organizationId: input.organizationId,
        enabled: input.enabled,
        provider: input.provider,
        environment: input.environment,
        apiKeyEncrypted: input.apiKeyEncrypted,
        rutEmisor: input.rutEmisor,
        razonSocial: input.razonSocial,
        giro: input.giro,
        acteco: input.acteco,
        direccion: input.direccion,
        comuna: input.comuna,
        updatedAt: new Date(),
      })
      .returning();
    return this.mapToEntity(row);
  }

  async update(organizationId: number, patch: UpdateDteConfigInput): Promise<DteConfig> {
    const db = getDb();
    const [row] = await db
      .update(dteConfigTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(dteConfigTable.organizationId, organizationId))
      .returning();
    if (!row) throw new DteConfigNotFoundError(organizationId);
    return this.mapToEntity(row);
  }
}

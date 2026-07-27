import { inArray } from 'drizzle-orm';
import type { DteDocument } from '@/core/domain/entities/DteDocument';
import type { DteRetryQueueRepository } from '@/core/application/ports/DteRetryQueueRepository';
import { DTE_STATUS } from '@/core/domain/constants/DteConstants';
import { getDb } from '@/infra/db/client';
import { dteDocumentTable } from '@/infra/db/schema';
import { mapDteDocumentRow } from '@/infra/repositories/DteDocumentRepositoryDrizzle';

/**
 * Intentionally queries across every organization — see DteRetryQueueRepository.
 */
export class DteRetryQueueRepositoryDrizzle implements DteRetryQueueRepository {
  async findRetryable(): Promise<DteDocument[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(dteDocumentTable)
      .where(inArray(dteDocumentTable.status, [DTE_STATUS.PENDING, DTE_STATUS.FAILED]));
    return rows.map(mapDteDocumentRow);
  }
}

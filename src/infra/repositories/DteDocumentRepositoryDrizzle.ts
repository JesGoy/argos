import { eq, and, inArray } from 'drizzle-orm';
import type { DteDocument, CreateDteDocumentInput } from '@/core/domain/entities/DteDocument';
import type {
  DteDocumentRepository,
  DteDocumentUpdatePatch,
  DteDocumentSummary,
} from '@/core/application/ports/DteDocumentRepository';
import type { DteEnvironment, DteStatus, DteType } from '@/core/domain/constants/DteConstants';
import { DteDocumentNotFoundError } from '@/core/domain/errors/DteErrors';
import { getDb } from '@/infra/db/client';
import { dteDocumentTable, type DteDocumentRow } from '@/infra/db/schema';

/**
 * Exported so DteRetryQueueRepositoryDrizzle (which queries across every
 * organization) can map rows the same way without duplicating this logic.
 */
export function mapDteDocumentRow(row: DteDocumentRow): DteDocument {
  return {
    id: String(row.id),
    organizationId: row.organizationId,
    saleId: String(row.saleId),
    type: row.type as DteType,
    status: row.status as DteStatus,
    environment: row.environment as DteEnvironment,
    folio: row.folio ?? undefined,
    token: row.token ?? undefined,
    pdfBase64: row.pdfBase64 ?? undefined,
    netAmount: row.netAmount,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    referencesDocumentId:
      row.referencesDocumentId != null ? String(row.referencesDocumentId) : undefined,
    idempotencyKey: row.idempotencyKey,
    attempts: row.attempts,
    lastError: row.lastError ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DteDocumentRepositoryDrizzle implements DteDocumentRepository {
  constructor(private readonly organizationId: number) {}

  private orgScope() {
    return eq(dteDocumentTable.organizationId, this.organizationId);
  }

  async findBySaleAndType(saleId: string, type: DteType): Promise<DteDocument | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(dteDocumentTable)
      .where(
        and(
          eq(dteDocumentTable.saleId, parseInt(saleId, 10)),
          eq(dteDocumentTable.type, type),
          this.orgScope()
        )
      )
      .limit(1);
    const row = rows[0];
    return row ? mapDteDocumentRow(row) : null;
  }

  async findById(id: string): Promise<DteDocument | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(dteDocumentTable)
      .where(and(eq(dteDocumentTable.id, parseInt(id, 10)), this.orgScope()))
      .limit(1);
    const row = rows[0];
    return row ? mapDteDocumentRow(row) : null;
  }

  async create(input: CreateDteDocumentInput): Promise<DteDocument> {
    const db = getDb();
    const [row] = await db
      .insert(dteDocumentTable)
      .values({
        organizationId: this.organizationId,
        saleId: parseInt(input.saleId, 10),
        type: input.type,
        status: input.status,
        environment: input.environment,
        folio: input.folio,
        token: input.token,
        netAmount: input.netAmount,
        taxAmount: input.taxAmount,
        totalAmount: input.totalAmount,
        referencesDocumentId: input.referencesDocumentId
          ? parseInt(input.referencesDocumentId, 10)
          : undefined,
        idempotencyKey: input.idempotencyKey,
        lastError: input.lastError,
        updatedAt: new Date(),
      })
      .returning();
    return mapDteDocumentRow(row);
  }

  async update(id: string, patch: DteDocumentUpdatePatch): Promise<DteDocument> {
    const db = getDb();
    const [row] = await db
      .update(dteDocumentTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(dteDocumentTable.id, parseInt(id, 10)), this.orgScope()))
      .returning();
    if (!row) throw new DteDocumentNotFoundError(id);
    return mapDteDocumentRow(row);
  }

  async findSummariesBySaleIds(saleIds: string[], type: DteType): Promise<DteDocumentSummary[]> {
    if (saleIds.length === 0) return [];
    const db = getDb();
    const rows = await db
      .select({
        id: dteDocumentTable.id,
        saleId: dteDocumentTable.saleId,
        status: dteDocumentTable.status,
        folio: dteDocumentTable.folio,
      })
      .from(dteDocumentTable)
      .where(
        and(
          inArray(
            dteDocumentTable.saleId,
            saleIds.map((id) => parseInt(id, 10))
          ),
          eq(dteDocumentTable.type, type),
          this.orgScope()
        )
      );

    return rows.map((row) => ({
      id: String(row.id),
      saleId: String(row.saleId),
      status: row.status as DteStatus,
      folio: row.folio ?? undefined,
    }));
  }
}

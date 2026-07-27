import type { DteDocument, CreateDteDocumentInput } from '@/core/domain/entities/DteDocument';
import type { DteStatus, DteType } from '@/core/domain/constants/DteConstants';

/**
 * Fields a caller may update on an existing outbox row. Kept separate from
 * `DteDocument` because `providerResponse` is a persistence-only audit
 * column — the domain entity doesn't carry the provider's raw payload.
 */
export interface DteDocumentUpdatePatch {
  status?: DteStatus;
  folio?: number;
  token?: string;
  pdfBase64?: string;
  attempts?: number;
  lastError?: string;
  providerResponse?: unknown;
}

/** Lightweight per-sale projection for list views (no pdfBase64/providerResponse). */
export interface DteDocumentSummary {
  id: string;
  saleId: string;
  status: DteStatus;
  folio?: number;
}

/**
 * DteDocument Repository Port (outbox)
 *
 * Org-scoped. One row per intended document per (organizationId, saleId,
 * type) — `findBySaleAndType` is how a use case checks "does this sale
 * already have a boleta/NC?" before creating a new one.
 */
export interface DteDocumentRepository {
  findBySaleAndType(saleId: string, type: DteType): Promise<DteDocument | null>;
  findById(id: string): Promise<DteDocument | null>;
  create(input: CreateDteDocumentInput): Promise<DteDocument>;
  update(id: string, patch: DteDocumentUpdatePatch): Promise<DteDocument>;
  /**
   * Batched projection for a page of sales (avoids N+1 the same way
   * SaleItemRepository.findBySaleIds does). Excludes the heavy pdfBase64 and
   * providerResponse columns — list views only need status/folio.
   */
  findSummariesBySaleIds(saleIds: string[], type: DteType): Promise<DteDocumentSummary[]>;
}

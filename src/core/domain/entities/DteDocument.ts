import { DTE_STATUS, DTE_MAX_SEND_DELAY_MINUTES } from '@/core/domain/constants/DteConstants';
import type { DteType, DteStatus, DteEnvironment } from '@/core/domain/constants/DteConstants';

/**
 * DteDocument Domain Entity — one outbox row per intended SII document.
 *
 * Amounts are whole CLP pesos, not cents — the one table in the domain that
 * intentionally breaks the cents convention (see TaxRules.centsToClp): this
 * feature is Chile-only and pesos are the unit the SII and every DTE
 * provider actually validate against.
 *
 * A row is created once per (organizationId, saleId, type) and updated in
 * place across retries (pending → sent → accepted/rejected), reusing the
 * same `idempotencyKey` every attempt so a provider retry within its
 * idempotency window always resolves to the same document instead of a
 * duplicate emission.
 */
export interface DteDocument {
  id: string;
  organizationId: number;
  saleId: string;
  type: DteType;
  status: DteStatus;
  environment: DteEnvironment;
  folio?: number;
  token?: string;
  /** Printable representation (base64), set the moment the provider accepts the document. */
  pdfBase64?: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  /** For a Nota de Crédito (61): the DteDocument row of the boleta it cancels. */
  referencesDocumentId?: string;
  idempotencyKey: string;
  attempts: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateDteDocumentInput = Omit<DteDocument, 'id' | 'attempts' | 'createdAt' | 'updatedAt'>;

/** A row in one of these states will never be retried again. */
export function isTerminal(status: DteStatus): boolean {
  return status === DTE_STATUS.ACCEPTED || status === DTE_STATUS.REJECTED || status === DTE_STATUS.CANCELLED;
}

/** True once the Res. Ex. 74/2020 one-hour transmission window has elapsed. */
export function isPastSendDeadline(createdAt: Date, now: Date): boolean {
  const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (60 * 1000);
  return elapsedMinutes > DTE_MAX_SEND_DELAY_MINUTES;
}

/**
 * Deterministic idempotency key derived from stable identifiers (no
 * timestamp/random) — every retry of the same intended document reuses it,
 * so the provider's idempotency window always maps back to this one row.
 */
export function buildIdempotencyKey(organizationId: number, saleId: string, type: DteType): string {
  return `ARGOS_${organizationId}_${saleId}_${type}`;
}

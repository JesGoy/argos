import type { DteConfig } from '@/core/domain/entities/DteConfig';

/**
 * A single sale line as it must appear on the printed/digital boleta.
 * Amounts are whole CLP pesos, IVA-inclusive (gross) — see TaxRules.
 */
export interface DteBoletaLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IssueBoletaInput {
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: DteBoletaLineItem[];
  emissionDate: Date;
}

/**
 * A Nota de Crédito always cancels a sale in full here (Argos has no partial
 * refund flow), so it needs only the referenced boleta's folio and totals —
 * no line items.
 */
export interface IssueCreditNoteInput {
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
  referencedFolio: number;
  emissionDate: Date;
}

export interface DteIssueResult {
  folio: number;
  token: string;
  pdfBase64: string;
  xmlBase64: string;
  /** Raw provider response, persisted verbatim for audit/support debugging. */
  rawResponse: unknown;
}

/**
 * Abstracts the DTE-issuing backend so domain/application code never depends
 * on a concrete provider. Today `OpenfacturaDteProvider`; the SII's own REST
 * API could implement this same contract later without touching a use case.
 *
 * Implementations resolve synchronously to an accepted document or throw —
 * there is no `getDocumentStatus` yet because every current provider
 * (Openfactura) resolves acceptance in the same call. An async provider
 * (e.g. direct SII with polling) would need that method added when it
 * actually exists.
 */
export interface DteProvider {
  issueBoleta(input: IssueBoletaInput, idempotencyKey: string): Promise<DteIssueResult>;
  issueCreditNote(input: IssueCreditNoteInput, idempotencyKey: string): Promise<DteIssueResult>;
}

/**
 * Builds a DteProvider for an already-loaded DteConfig. Use cases depend on
 * this function type instead of importing the infra container directly,
 * keeping them free of concrete/framework dependencies; the container
 * supplies the real implementation (`makeDteProvider`) at wiring time.
 */
export type DteProviderFactory = (config: DteConfig) => DteProvider;

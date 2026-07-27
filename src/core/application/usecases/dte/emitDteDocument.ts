import type { DteDocument } from '@/core/domain/entities/DteDocument';
import type { DteDocumentRepository } from '@/core/application/ports/DteDocumentRepository';
import type { DteIssueResult } from '@/core/application/ports/DteProvider';
import { DTE_STATUS } from '@/core/domain/constants/DteConstants';
import {
  DteIdempotencyConflictError,
  DteProviderConfigError,
  DteProviderRequestError,
} from '@/core/domain/errors/DteErrors';

/**
 * Shared by IssueDteForSale and IssueCreditNoteForSale: calls the provider
 * and maps the outcome onto the outbox row. Any provider-shaped failure is
 * persisted as a status on `document`, never thrown — DTE issuance is a
 * best-effort side effect that must never surface as a use-case error (see
 * the callers' own doc comments for why). A truly unexpected error (a bug,
 * a DB failure) still propagates, since swallowing those would hide real
 * problems instead of just queuing a retry.
 */
export async function emitDteDocument(
  dteDocuments: DteDocumentRepository,
  document: DteDocument,
  emit: () => Promise<DteIssueResult>
): Promise<DteDocument> {
  try {
    const result = await emit();
    return dteDocuments.update(document.id, {
      status: DTE_STATUS.ACCEPTED,
      folio: result.folio,
      token: result.token,
      pdfBase64: result.pdfBase64,
      providerResponse: result.rawResponse,
      attempts: document.attempts + 1,
    });
  } catch (err) {
    if (err instanceof DteIdempotencyConflictError) {
      // The provider confirms this exact document was already issued under
      // our idempotency key — recoverable, but we don't have its folio
      // without a status lookup we haven't built yet (see DteProvider.ts).
      return dteDocuments.update(document.id, {
        status: DTE_STATUS.SENT,
        token: err.token,
        attempts: document.attempts + 1,
        lastError: err.message,
      });
    }
    if (err instanceof DteProviderConfigError || err instanceof DteProviderRequestError) {
      return dteDocuments.update(document.id, {
        status: DTE_STATUS.FAILED,
        attempts: document.attempts + 1,
        lastError: err.message,
      });
    }
    throw err;
  }
}

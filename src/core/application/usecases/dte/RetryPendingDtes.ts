import type { DteRetryQueueRepository } from '@/core/application/ports/DteRetryQueueRepository';
import type { IssueDteForSale } from '@/core/application/usecases/dte/IssueDteForSale';
import type { IssueCreditNoteForSale } from '@/core/application/usecases/dte/IssueCreditNoteForSale';
import { DTE_TYPE, DTE_STATUS } from '@/core/domain/constants/DteConstants';
import { isPastSendDeadline } from '@/core/domain/entities/DteDocument';

export type IssueDteForSaleFactory = (organizationId: number) => IssueDteForSale;
export type IssueCreditNoteForSaleFactory = (organizationId: number) => IssueCreditNoteForSale;

export interface RetryPendingDtesResult {
  attempted: number;
  succeeded: number;
  stillPending: number;
  /** Past the SII's one-hour transmission window and still not accepted. */
  overdue: number;
}

/**
 * Use Case: Retry Pending Dtes
 *
 * System-level sweep (not org-scoped — see DteRetryQueueRepository) meant to
 * run every few minutes. Re-attempts every outbox row stuck in `pending` or
 * `failed` by calling the exact same entrypoint the original sale/cancel
 * used (IssueDteForSale / IssueCreditNoteForSale per row's own type), so
 * there is no separate "resume" code path to keep in sync with the primary
 * one — a retry is just another call with the same idempotencyKey.
 */
export class RetryPendingDtes {
  constructor(
    private readonly deps: {
      retryQueue: DteRetryQueueRepository;
      buildIssueDteForSale: IssueDteForSaleFactory;
      buildIssueCreditNoteForSale: IssueCreditNoteForSaleFactory;
    }
  ) {}

  async execute(): Promise<RetryPendingDtesResult> {
    const candidates = await this.deps.retryQueue.findRetryable();
    const now = new Date();

    let succeeded = 0;
    let overdue = 0;

    for (const doc of candidates) {
      if (isPastSendDeadline(doc.createdAt, now)) {
        overdue++;
      }
      try {
        const result =
          doc.type === DTE_TYPE.NOTA_CREDITO
            ? await this.deps
                .buildIssueCreditNoteForSale(doc.organizationId)
                .execute({ saleId: doc.saleId })
            : await this.deps.buildIssueDteForSale(doc.organizationId).execute({ saleId: doc.saleId });
        if (result?.status === DTE_STATUS.ACCEPTED) {
          succeeded++;
        }
      } catch {
        // One row's unexpected failure must not abort the whole sweep — the
        // next cron tick will pick it up again.
      }
    }

    return {
      attempted: candidates.length,
      succeeded,
      stillPending: candidates.length - succeeded,
      overdue,
    };
  }
}

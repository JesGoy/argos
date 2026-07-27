import { describe, it, expect, vi } from 'vitest';
import { RetryPendingDtes } from './RetryPendingDtes';
import type { IssueDteForSaleFactory, IssueCreditNoteForSaleFactory } from './RetryPendingDtes';
import { DTE_TYPE, DTE_STATUS, DTE_ENVIRONMENT } from '@/core/domain/constants/DteConstants';
import type { DteRetryQueueRepository } from '@/core/application/ports/DteRetryQueueRepository';
import type { IssueDteForSale } from './IssueDteForSale';
import type { IssueCreditNoteForSale } from './IssueCreditNoteForSale';
import type { DteDocument } from '@/core/domain/entities/DteDocument';

function makeDoc(overrides: Partial<DteDocument> = {}): DteDocument {
  return {
    id: 'd1',
    organizationId: 42,
    saleId: 's1',
    type: DTE_TYPE.BOLETA_AFECTA,
    status: DTE_STATUS.PENDING,
    environment: DTE_ENVIRONMENT.CERTIFICACION,
    netAmount: 100,
    taxAmount: 19,
    totalAmount: 119,
    idempotencyKey: 'k',
    attempts: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RetryPendingDtes', () => {
  it('dispatches a boleta row to IssueDteForSale and a NC row to IssueCreditNoteForSale, per-org', async () => {
    const boletaDoc = makeDoc({ id: 'd1', saleId: 's1', organizationId: 42, type: DTE_TYPE.BOLETA_AFECTA });
    const ncDoc = makeDoc({ id: 'd2', saleId: 's2', organizationId: 7, type: DTE_TYPE.NOTA_CREDITO });

    const retryQueue = {
      findRetryable: vi.fn().mockResolvedValue([boletaDoc, ncDoc]),
    } satisfies DteRetryQueueRepository;

    const issueDte = { execute: vi.fn().mockResolvedValue(makeDoc({ status: DTE_STATUS.ACCEPTED })) } as unknown as IssueDteForSale;
    const issueNc = { execute: vi.fn().mockResolvedValue(makeDoc({ status: DTE_STATUS.ACCEPTED })) } as unknown as IssueCreditNoteForSale;
    const buildIssueDteForSale = vi.fn().mockReturnValue(issueDte) as unknown as IssueDteForSaleFactory;
    const buildIssueCreditNoteForSale = vi.fn().mockReturnValue(issueNc) as unknown as IssueCreditNoteForSaleFactory;

    const useCase = new RetryPendingDtes({ retryQueue, buildIssueDteForSale, buildIssueCreditNoteForSale });
    const result = await useCase.execute();

    expect(buildIssueDteForSale).toHaveBeenCalledWith(42);
    expect(issueDte.execute).toHaveBeenCalledWith({ saleId: 's1' });
    expect(buildIssueCreditNoteForSale).toHaveBeenCalledWith(7);
    expect(issueNc.execute).toHaveBeenCalledWith({ saleId: 's2' });
    expect(result).toEqual({ attempted: 2, succeeded: 2, stillPending: 0, overdue: 0 });
  });

  it('counts documents past the one-hour SLA as overdue without failing the sweep', async () => {
    const overdueDoc = makeDoc({ createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) });
    const retryQueue = { findRetryable: vi.fn().mockResolvedValue([overdueDoc]) } satisfies DteRetryQueueRepository;
    const issueDte = { execute: vi.fn().mockResolvedValue(makeDoc({ status: DTE_STATUS.FAILED })) } as unknown as IssueDteForSale;

    const useCase = new RetryPendingDtes({
      retryQueue,
      buildIssueDteForSale: vi.fn().mockReturnValue(issueDte) as unknown as IssueDteForSaleFactory,
      buildIssueCreditNoteForSale: vi.fn() as unknown as IssueCreditNoteForSaleFactory,
    });

    const result = await useCase.execute();

    expect(result).toEqual({ attempted: 1, succeeded: 0, stillPending: 1, overdue: 1 });
  });

  it('does not let one row throwing unexpectedly abort the rest of the sweep', async () => {
    const docA = makeDoc({ id: 'a', saleId: 'sa' });
    const docB = makeDoc({ id: 'b', saleId: 'sb' });
    const retryQueue = { findRetryable: vi.fn().mockResolvedValue([docA, docB]) } satisfies DteRetryQueueRepository;
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('unexpected'))
      .mockResolvedValueOnce(makeDoc({ status: DTE_STATUS.ACCEPTED }));
    const issueDte = { execute } as unknown as IssueDteForSale;

    const useCase = new RetryPendingDtes({
      retryQueue,
      buildIssueDteForSale: vi.fn().mockReturnValue(issueDte) as unknown as IssueDteForSaleFactory,
      buildIssueCreditNoteForSale: vi.fn() as unknown as IssueCreditNoteForSaleFactory,
    });

    const result = await useCase.execute();

    expect(result.attempted).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

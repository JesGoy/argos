import { describe, it, expect, vi } from 'vitest';
import { SalesCommandService } from './SalesCommandService';
import { SALE_COMMAND_ACTION, PAYMENT_METHOD } from '@/core/domain/constants/SaleConstants';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import type { ProcessSale, ProcessSaleResult } from './ProcessSale';
import type { CancelSale } from './CancelSale';
import type { IssueDteForSale } from '@/core/application/usecases/dte/IssueDteForSale';
import type { IssueCreditNoteForSale } from '@/core/application/usecases/dte/IssueCreditNoteForSale';
import type { SalesCommandActor } from './SalesCommandService';

function makeProcessSaleResult(): ProcessSaleResult {
  return {
    sale: {
      id: 's1',
      saleNumber: 'V-0001',
      userId: 1,
      totalAmount: 1000,
      paymentMethod: PAYMENT_METHOD.CASH,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    items: [],
  };
}

function makeDeps() {
  const processSale = {
    execute: vi.fn().mockResolvedValue(makeProcessSaleResult()),
  } as unknown as ProcessSale;
  const cancelSale = { execute: vi.fn().mockResolvedValue(undefined) } as unknown as CancelSale;
  const issueDteForSale = { execute: vi.fn().mockResolvedValue(null) } as unknown as IssueDteForSale;
  const issueCreditNoteForSale = {
    execute: vi.fn().mockResolvedValue(null),
  } as unknown as IssueCreditNoteForSale;

  const service = new SalesCommandService({
    processSale,
    cancelSale,
    issueDteForSale,
    issueCreditNoteForSale,
  });

  return { service, processSale, cancelSale, issueDteForSale, issueCreditNoteForSale };
}

const operator: SalesCommandActor = {
  userId: 1,
  role: USER_ROLE.OPERATOR,
  source: PRODUCT_COMMAND_SOURCE.MANUAL,
};

const viewer: SalesCommandActor = {
  userId: 2,
  role: USER_ROLE.VIEWER,
  source: PRODUCT_COMMAND_SOURCE.MANUAL,
};

describe('SalesCommandService', () => {
  it('processSale issues the DTE for the newly created sale', async () => {
    const { service, issueDteForSale } = makeDeps();

    const result = await service.processSale(operator, { items: [], paymentMethod: PAYMENT_METHOD.CASH });

    expect(issueDteForSale.execute).toHaveBeenCalledWith({ saleId: 's1' });
    expect(result.action).toBe(SALE_COMMAND_ACTION.PROCESS_SALE);
  });

  it('processSale still returns a successful result even if DTE issuance throws unexpectedly', async () => {
    const { service, issueDteForSale } = makeDeps();
    (issueDteForSale.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('sii is down'));

    const result = await service.processSale(operator, { items: [], paymentMethod: PAYMENT_METHOD.CASH });

    expect(result.action).toBe(SALE_COMMAND_ACTION.PROCESS_SALE);
    expect(result.data.sale.id).toBe('s1');
  });

  it('cancelSale issues the credit note for the cancelled sale', async () => {
    const { service, cancelSale, issueCreditNoteForSale } = makeDeps();

    const result = await service.cancelSale(operator, 's1');

    expect(cancelSale.execute).toHaveBeenCalledWith('s1', operator.userId);
    expect(issueCreditNoteForSale.execute).toHaveBeenCalledWith({ saleId: 's1' });
    expect(result.action).toBe(SALE_COMMAND_ACTION.CANCEL_SALE);
  });

  it('cancelSale still succeeds even if credit note issuance throws unexpectedly', async () => {
    const { service, issueCreditNoteForSale } = makeDeps();
    (issueCreditNoteForSale.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('sii is down'));

    const result = await service.cancelSale(operator, 's1');

    expect(result.action).toBe(SALE_COMMAND_ACTION.CANCEL_SALE);
  });

  it('rejects an unauthorized role before touching processSale or DTE issuance', async () => {
    const { service, processSale, issueDteForSale } = makeDeps();

    await expect(
      service.processSale(viewer, { items: [], paymentMethod: PAYMENT_METHOD.CASH })
    ).rejects.toThrow(UnauthorizedError);
    expect(processSale.execute).not.toHaveBeenCalled();
    expect(issueDteForSale.execute).not.toHaveBeenCalled();
  });
});

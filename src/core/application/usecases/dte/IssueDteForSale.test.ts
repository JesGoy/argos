import { describe, it, expect, vi } from 'vitest';
import { IssueDteForSale } from './IssueDteForSale';
import { DTE_TYPE, DTE_STATUS, DTE_ENVIRONMENT, DTE_PROVIDER } from '@/core/domain/constants/DteConstants';
import { DteProviderRequestError, DteIdempotencyConflictError } from '@/core/domain/errors/DteErrors';
import { SaleNotFoundError } from '@/core/domain/errors/POSErrors';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type { DteConfigRepository } from '@/core/application/ports/DteConfigRepository';
import type { DteDocumentRepository } from '@/core/application/ports/DteDocumentRepository';
import type { DteProvider } from '@/core/application/ports/DteProvider';
import type { Sale } from '@/core/domain/entities/Sale';
import type { SaleItem } from '@/core/domain/entities/SaleItem';
import type { DteConfig } from '@/core/domain/entities/DteConfig';
import type { DteDocument } from '@/core/domain/entities/DteDocument';

// $6.800 CLP sale — matches the amounts verified live in scripts/spike-openfactura.mjs.
const sale: Sale = {
  id: 's1',
  saleNumber: 'V-0001',
  userId: 1,
  totalAmount: 680000, // cents
  paymentMethod: 'cash',
  status: 'completed',
  completedAt: new Date('2026-07-20T12:00:00Z'),
  createdAt: new Date('2026-07-20T12:00:00Z'),
  updatedAt: new Date('2026-07-20T12:00:00Z'),
};

const items: SaleItem[] = [
  {
    id: 'si1',
    saleId: 's1',
    productId: 'p1',
    sku: 'CAP-001',
    productName: 'Cappuccino',
    quantity: 2,
    unitPrice: 250000,
    subtotal: 500000,
    createdAt: new Date(),
  },
  {
    id: 'si2',
    saleId: 's1',
    productId: 'p2',
    sku: 'CRO-001',
    productName: 'Croissant',
    quantity: 1,
    unitPrice: 180000,
    subtotal: 180000,
    createdAt: new Date(),
  },
];

const enabledConfig: DteConfig = {
  id: 1,
  organizationId: 42,
  enabled: true,
  provider: DTE_PROVIDER.OPENFACTURA,
  environment: DTE_ENVIRONMENT.CERTIFICACION,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeDocument(overrides: Partial<DteDocument> = {}): DteDocument {
  return {
    id: 'd1',
    organizationId: 42,
    saleId: 's1',
    type: DTE_TYPE.BOLETA_AFECTA,
    status: DTE_STATUS.PENDING,
    environment: DTE_ENVIRONMENT.CERTIFICACION,
    netAmount: 5714,
    taxAmount: 1086,
    totalAmount: 6800,
    idempotencyKey: 'ARGOS_42_s1_39',
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDeps(opts: { config?: DteConfig | null; existing?: DteDocument | null } = {}) {
  const sales = {
    findById: vi.fn().mockResolvedValue(sale),
    findBySaleNumber: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    getTodayStats: vi.fn(),
    getDateRangeStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    generateSaleNumber: vi.fn(),
    getDailySalesTrend: vi.fn(),
  } satisfies SaleRepository;

  const saleItems = {
    findBySaleId: vi.fn().mockResolvedValue(items),
    findBySaleIds: vi.fn(),
    createBatch: vi.fn(),
    deleteBySaleId: vi.fn(),
    getTopProducts: vi.fn(),
    getMarginByProduct: vi.fn(),
    getQuantitySoldByProduct: vi.fn(),
    getDailyQuantityByProduct: vi.fn(),
  } satisfies SaleItemRepository;

  const dteConfigs = {
    findByOrganizationId: vi
      .fn()
      .mockResolvedValue(opts.config === undefined ? enabledConfig : opts.config),
    create: vi.fn(),
    update: vi.fn(),
  } satisfies DteConfigRepository;

  const created = makeDocument();
  const dteDocuments = {
    findBySaleAndType: vi.fn().mockResolvedValue(opts.existing ?? null),
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue(created),
    update: vi
      .fn()
      .mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({
        ...(opts.existing ?? created),
        ...patch,
      })),
    findSummariesBySaleIds: vi.fn(),
  } satisfies DteDocumentRepository;

  const provider = {
    issueBoleta: vi.fn(),
    issueCreditNote: vi.fn(),
  } satisfies DteProvider;

  const buildProvider = vi.fn().mockReturnValue(provider);

  const useCase = new IssueDteForSale({
    organizationId: 42,
    sales,
    saleItems,
    dteConfigs,
    dteDocuments,
    buildProvider,
  });

  return { useCase, sales, saleItems, dteConfigs, dteDocuments, provider, buildProvider };
}

describe('IssueDteForSale', () => {
  it('does nothing when the organization has no DteConfig', async () => {
    const { useCase, dteDocuments } = makeDeps({ config: null });

    const result = await useCase.execute({ saleId: 's1' });

    expect(result).toBeNull();
    expect(dteDocuments.create).not.toHaveBeenCalled();
  });

  it('does nothing when DTE is disabled for the organization', async () => {
    const { useCase, dteDocuments } = makeDeps({ config: { ...enabledConfig, enabled: false } });

    const result = await useCase.execute({ saleId: 's1' });

    expect(result).toBeNull();
    expect(dteDocuments.create).not.toHaveBeenCalled();
  });

  it('returns the existing document without calling the provider when already accepted', async () => {
    const accepted = makeDocument({ status: DTE_STATUS.ACCEPTED, folio: 999 });
    const { useCase, provider, dteDocuments } = makeDeps({ existing: accepted });

    const result = await useCase.execute({ saleId: 's1' });

    expect(result).toEqual(accepted);
    expect(provider.issueBoleta).not.toHaveBeenCalled();
    expect(dteDocuments.create).not.toHaveBeenCalled();
  });

  it('reuses a non-terminal existing document instead of creating a duplicate', async () => {
    const failedBefore = makeDocument({ status: DTE_STATUS.FAILED, attempts: 1 });
    const { useCase, dteDocuments, provider } = makeDeps({ existing: failedBefore });
    provider.issueBoleta.mockResolvedValue({
      folio: 100,
      token: 'tok',
      pdfBase64: '',
      xmlBase64: '',
      rawResponse: {},
    });

    await useCase.execute({ saleId: 's1' });

    expect(dteDocuments.create).not.toHaveBeenCalled();
    expect(dteDocuments.update).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ attempts: 2 })
    );
  });

  it('computes net/tax from the sale total in cents and issues an accepted boleta', async () => {
    const { useCase, provider, dteDocuments } = makeDeps();
    provider.issueBoleta.mockResolvedValue({
      folio: 655742,
      token: 'tok-1',
      pdfBase64: 'pdf',
      xmlBase64: 'xml',
      rawResponse: { FOLIO: 655742 },
    });

    const result = await useCase.execute({ saleId: 's1' });

    expect(provider.issueBoleta).toHaveBeenCalledWith(
      expect.objectContaining({
        netAmount: 5714,
        taxAmount: 1086,
        totalAmount: 6800,
        items: [
          { description: 'Cappuccino', quantity: 2, unitPrice: 2500, totalPrice: 5000 },
          { description: 'Croissant', quantity: 1, unitPrice: 1800, totalPrice: 1800 },
        ],
      }),
      'ARGOS_42_s1_39'
    );
    expect(dteDocuments.update).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ status: DTE_STATUS.ACCEPTED, folio: 655742, token: 'tok-1' })
    );
    expect(result?.status).toBe(DTE_STATUS.ACCEPTED);
  });

  it('marks the document failed and does not throw when the provider rejects', async () => {
    const { useCase, provider, dteDocuments } = makeDeps();
    provider.issueBoleta.mockRejectedValue(new DteProviderRequestError('boom', 'OF-10'));

    const result = await useCase.execute({ saleId: 's1' });

    expect(result?.status).toBe(DTE_STATUS.FAILED);
    expect(dteDocuments.update).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ status: DTE_STATUS.FAILED, lastError: expect.stringContaining('boom') })
    );
  });

  it('marks the document sent with the recovered token on an idempotency conflict', async () => {
    const { useCase, provider } = makeDeps();
    provider.issueBoleta.mockRejectedValue(new DteIdempotencyConflictError('recovered-token'));

    const result = await useCase.execute({ saleId: 's1' });

    expect(result?.status).toBe(DTE_STATUS.SENT);
    expect(result?.token).toBe('recovered-token');
  });

  it('throws SaleNotFoundError when the sale does not exist (a real bug, not a provider failure)', async () => {
    const { useCase, sales } = makeDeps();
    sales.findById.mockResolvedValue(null);

    await expect(useCase.execute({ saleId: 'missing' })).rejects.toThrow(SaleNotFoundError);
  });
});

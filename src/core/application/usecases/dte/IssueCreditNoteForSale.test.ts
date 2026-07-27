import { describe, it, expect, vi } from 'vitest';
import { IssueCreditNoteForSale } from './IssueCreditNoteForSale';
import { DTE_TYPE, DTE_STATUS, DTE_ENVIRONMENT, DTE_PROVIDER } from '@/core/domain/constants/DteConstants';
import { DteProviderRequestError } from '@/core/domain/errors/DteErrors';
import type { DteConfigRepository } from '@/core/application/ports/DteConfigRepository';
import type { DteDocumentRepository } from '@/core/application/ports/DteDocumentRepository';
import type { DteProvider } from '@/core/application/ports/DteProvider';
import type { DteConfig } from '@/core/domain/entities/DteConfig';
import type { DteDocument } from '@/core/domain/entities/DteDocument';

const enabledConfig: DteConfig = {
  id: 1,
  organizationId: 42,
  enabled: true,
  provider: DTE_PROVIDER.OPENFACTURA,
  environment: DTE_ENVIRONMENT.CERTIFICACION,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeBoleta(overrides: Partial<DteDocument> = {}): DteDocument {
  return {
    id: 'boleta-1',
    organizationId: 42,
    saleId: 's1',
    type: DTE_TYPE.BOLETA_AFECTA,
    status: DTE_STATUS.ACCEPTED,
    environment: DTE_ENVIRONMENT.CERTIFICACION,
    folio: 655742,
    token: 'tok',
    netAmount: 5714,
    taxAmount: 1086,
    totalAmount: 6800,
    idempotencyKey: 'ARGOS_42_s1_39',
    attempts: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeNc(overrides: Partial<DteDocument> = {}): DteDocument {
  return {
    id: 'nc-1',
    organizationId: 42,
    saleId: 's1',
    type: DTE_TYPE.NOTA_CREDITO,
    status: DTE_STATUS.PENDING,
    environment: DTE_ENVIRONMENT.CERTIFICACION,
    netAmount: 5714,
    taxAmount: 1086,
    totalAmount: 6800,
    referencesDocumentId: 'boleta-1',
    idempotencyKey: 'ARGOS_42_s1_61',
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDeps(
  opts: { config?: DteConfig | null; boleta?: DteDocument | null; existingNc?: DteDocument | null } = {}
) {
  const config = opts.config === undefined ? enabledConfig : opts.config;
  const boleta = opts.boleta === undefined ? makeBoleta() : opts.boleta;
  const existingNc = opts.existingNc ?? null;

  const dteConfigs = {
    findByOrganizationId: vi.fn().mockResolvedValue(config),
    create: vi.fn(),
    update: vi.fn(),
  } satisfies DteConfigRepository;

  const created = makeNc();
  const dteDocuments = {
    findBySaleAndType: vi
      .fn()
      .mockImplementation(async (_saleId: string, type: number) =>
        type === DTE_TYPE.BOLETA_AFECTA ? boleta : existingNc
      ),
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue(created),
    update: vi
      .fn()
      .mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({
        ...(existingNc ?? created),
        ...patch,
      })),
    findSummariesBySaleIds: vi.fn(),
  } satisfies DteDocumentRepository;

  const provider = {
    issueBoleta: vi.fn(),
    issueCreditNote: vi.fn(),
  } satisfies DteProvider;

  const buildProvider = vi.fn().mockReturnValue(provider);

  const useCase = new IssueCreditNoteForSale({
    organizationId: 42,
    dteConfigs,
    dteDocuments,
    buildProvider,
  });

  return { useCase, dteConfigs, dteDocuments, provider, buildProvider };
}

describe('IssueCreditNoteForSale', () => {
  it('does nothing when DTE is disabled', async () => {
    const { useCase, dteDocuments } = makeDeps({ config: null });

    const result = await useCase.execute({ saleId: 's1' });

    expect(result).toBeNull();
    expect(dteDocuments.create).not.toHaveBeenCalled();
  });

  it('does nothing when there is no boleta for the sale', async () => {
    const { useCase, dteDocuments } = makeDeps({ boleta: null });

    const result = await useCase.execute({ saleId: 's1' });

    expect(result).toBeNull();
    expect(dteDocuments.create).not.toHaveBeenCalled();
  });

  it('does nothing when the boleta was never accepted (still pending/failed)', async () => {
    const { useCase, dteDocuments } = makeDeps({
      boleta: makeBoleta({ status: DTE_STATUS.FAILED, folio: undefined }),
    });

    const result = await useCase.execute({ saleId: 's1' });

    expect(result).toBeNull();
    expect(dteDocuments.create).not.toHaveBeenCalled();
  });

  it('returns the existing credit note unchanged when already accepted (no double-void)', async () => {
    const existingNc = makeNc({ status: DTE_STATUS.ACCEPTED, folio: 100 });
    const { useCase, provider, dteDocuments } = makeDeps({ existingNc });

    const result = await useCase.execute({ saleId: 's1' });

    expect(result).toEqual(existingNc);
    expect(provider.issueCreditNote).not.toHaveBeenCalled();
    expect(dteDocuments.create).not.toHaveBeenCalled();
  });

  it('issues a credit note referencing the boleta folio with matching amounts', async () => {
    const { useCase, provider, dteDocuments } = makeDeps();
    provider.issueCreditNote.mockResolvedValue({
      folio: 102046,
      token: 'nc-tok',
      pdfBase64: '',
      xmlBase64: '',
      rawResponse: {},
    });

    const result = await useCase.execute({ saleId: 's1' });

    expect(provider.issueCreditNote).toHaveBeenCalledWith(
      expect.objectContaining({
        netAmount: 5714,
        taxAmount: 1086,
        totalAmount: 6800,
        referencedFolio: 655742,
      }),
      'ARGOS_42_s1_61'
    );
    expect(dteDocuments.update).toHaveBeenCalledWith(
      'nc-1',
      expect.objectContaining({ status: DTE_STATUS.ACCEPTED, folio: 102046 })
    );
    expect(result?.status).toBe(DTE_STATUS.ACCEPTED);
  });

  it('marks the credit note failed without throwing when the provider rejects', async () => {
    const { useCase, provider } = makeDeps();
    provider.issueCreditNote.mockRejectedValue(new DteProviderRequestError('boom'));

    const result = await useCase.execute({ saleId: 's1' });

    expect(result?.status).toBe(DTE_STATUS.FAILED);
  });
});

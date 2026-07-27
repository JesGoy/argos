import { describe, it, expect, vi } from 'vitest';
import { TestDteConnection } from './TestDteConnection';
import { DTE_ENVIRONMENT } from '@/core/domain/constants/DteConstants';
import type { DteProvider } from '@/core/application/ports/DteProvider';

describe('TestDteConnection', () => {
  it('always builds the provider with a certificación config, regardless of any real org config', async () => {
    const provider = {
      issueBoleta: vi.fn().mockResolvedValue({
        folio: 123,
        token: 'tok',
        pdfBase64: 'pdf-bytes',
        xmlBase64: '',
        rawResponse: {},
      }),
      issueCreditNote: vi.fn(),
    } satisfies DteProvider;
    const buildProvider = vi.fn().mockReturnValue(provider);

    const useCase = new TestDteConnection({ buildProvider });
    const result = await useCase.execute();

    expect(buildProvider).toHaveBeenCalledWith(
      expect.objectContaining({ environment: DTE_ENVIRONMENT.CERTIFICACION })
    );
    expect(provider.issueBoleta).toHaveBeenCalledWith(
      expect.objectContaining({ netAmount: 840, taxAmount: 160, totalAmount: 1000 }),
      expect.stringMatching(/^ARGOS_TEST_/)
    );
    expect(result).toEqual({ folio: 123, pdfBase64: 'pdf-bytes' });
  });

  it('propagates a provider failure (no outbox row to fall back on)', async () => {
    const provider = {
      issueBoleta: vi.fn().mockRejectedValue(new Error('sandbox down')),
      issueCreditNote: vi.fn(),
    } satisfies DteProvider;
    const useCase = new TestDteConnection({ buildProvider: vi.fn().mockReturnValue(provider) });

    await expect(useCase.execute()).rejects.toThrow('sandbox down');
  });
});

import type { DteProviderFactory } from '@/core/application/ports/DteProvider';
import type { DteConfig } from '@/core/domain/entities/DteConfig';
import { DTE_ENVIRONMENT, DTE_PROVIDER } from '@/core/domain/constants/DteConstants';

export interface TestDteConnectionResult {
  folio: number;
  pdfBase64: string;
}

/**
 * Use Case: Test Dte Connection
 *
 * Issues a throwaway $1.000 boleta against Openfactura's sandbox so an admin
 * can confirm the flow works end-to-end before relying on it in real sales.
 * Deliberately certificación-only BY CONSTRUCTION: it always builds its own
 * synthetic sandbox config below and never reads the organization's real
 * environment/fiscal data, so there is no code path — buggy UI, direct
 * call, anything — through which this could ever touch producción and emit
 * a real tax document. Not part of the DTE outbox either — no DteDocument
 * row is created, so a failed test leaves nothing to clean up.
 */
export class TestDteConnection {
  constructor(private readonly deps: { buildProvider: DteProviderFactory }) {}

  async execute(): Promise<TestDteConnectionResult> {
    const sandboxConfig: DteConfig = {
      id: 0,
      organizationId: 0,
      enabled: true,
      provider: DTE_PROVIDER.OPENFACTURA,
      environment: DTE_ENVIRONMENT.CERTIFICACION,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const provider = this.deps.buildProvider(sandboxConfig);
    const result = await provider.issueBoleta(
      {
        netAmount: 840,
        taxAmount: 160,
        totalAmount: 1000,
        items: [
          { description: 'Prueba de conexión Argos', quantity: 1, unitPrice: 1000, totalPrice: 1000 },
        ],
        emissionDate: new Date(),
      },
      `ARGOS_TEST_${Date.now()}`
    );

    return { folio: result.folio, pdfBase64: result.pdfBase64 };
  }
}

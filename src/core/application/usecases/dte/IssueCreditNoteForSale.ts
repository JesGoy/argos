import type { DteConfigRepository } from '@/core/application/ports/DteConfigRepository';
import type { DteDocumentRepository } from '@/core/application/ports/DteDocumentRepository';
import type { DteProviderFactory } from '@/core/application/ports/DteProvider';
import type { DteDocument } from '@/core/domain/entities/DteDocument';
import { isTerminal, buildIdempotencyKey } from '@/core/domain/entities/DteDocument';
import { DTE_TYPE, DTE_STATUS } from '@/core/domain/constants/DteConstants';
import { emitDteDocument } from '@/core/application/usecases/dte/emitDteDocument';

export interface IssueCreditNoteForSaleInput {
  saleId: string;
}

/**
 * Use Case: Issue Credit Note For Sale
 *
 * Cancels a sale's boleta with a Nota de Crédito (61) when the sale is
 * cancelled. Only acts if that boleta was actually accepted by the SII —
 * a boleta still pending/failed has nothing to void yet (IssueDteForSale's
 * own retries will resolve it), and re-emitting for an already-cancelled
 * sale is a no-op. Re-derives everything from the existing DteDocument row
 * (no Sale/SaleItem lookup needed): net/tax/total and the folio to
 * reference are already there from when the boleta was issued.
 *
 * Same best-effort contract as IssueDteForSale — never throws for a
 * provider-shaped failure; cancelling a sale must succeed even if the SII
 * is unreachable.
 */
export class IssueCreditNoteForSale {
  constructor(
    private readonly deps: {
      organizationId: number;
      dteConfigs: DteConfigRepository;
      dteDocuments: DteDocumentRepository;
      buildProvider: DteProviderFactory;
    }
  ) {}

  async execute(input: IssueCreditNoteForSaleInput): Promise<DteDocument | null> {
    const config = await this.deps.dteConfigs.findByOrganizationId(this.deps.organizationId);
    if (!config || !config.enabled) {
      return null;
    }

    const boleta = await this.deps.dteDocuments.findBySaleAndType(input.saleId, DTE_TYPE.BOLETA_AFECTA);
    if (!boleta || boleta.status !== DTE_STATUS.ACCEPTED || boleta.folio == null) {
      return null;
    }

    const existing = await this.deps.dteDocuments.findBySaleAndType(input.saleId, DTE_TYPE.NOTA_CREDITO);
    if (existing && isTerminal(existing.status)) {
      return existing;
    }

    const document =
      existing ??
      (await this.deps.dteDocuments.create({
        organizationId: this.deps.organizationId,
        saleId: input.saleId,
        type: DTE_TYPE.NOTA_CREDITO,
        status: DTE_STATUS.PENDING,
        environment: config.environment,
        netAmount: boleta.netAmount,
        taxAmount: boleta.taxAmount,
        totalAmount: boleta.totalAmount,
        referencesDocumentId: boleta.id,
        idempotencyKey: buildIdempotencyKey(this.deps.organizationId, input.saleId, DTE_TYPE.NOTA_CREDITO),
      }));

    const provider = this.deps.buildProvider(config);
    return emitDteDocument(this.deps.dteDocuments, document, () =>
      provider.issueCreditNote(
        {
          netAmount: boleta.netAmount,
          taxAmount: boleta.taxAmount,
          totalAmount: boleta.totalAmount,
          referencedFolio: boleta.folio!,
          emissionDate: new Date(),
        },
        document.idempotencyKey
      )
    );
  }
}

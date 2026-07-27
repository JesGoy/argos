import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import type { DteConfigRepository } from '@/core/application/ports/DteConfigRepository';
import type { DteDocumentRepository } from '@/core/application/ports/DteDocumentRepository';
import type { DteProviderFactory, DteBoletaLineItem } from '@/core/application/ports/DteProvider';
import type { DteDocument } from '@/core/domain/entities/DteDocument';
import { isTerminal, buildIdempotencyKey } from '@/core/domain/entities/DteDocument';
import { DTE_TYPE, DTE_STATUS } from '@/core/domain/constants/DteConstants';
import { centsToClp, splitIva } from '@/core/domain/services/TaxRules';
import { SaleNotFoundError } from '@/core/domain/errors/POSErrors';
import { emitDteDocument } from '@/core/application/usecases/dte/emitDteDocument';

export interface IssueDteForSaleInput {
  saleId: string;
}

/**
 * Use Case: Issue Dte For Sale
 *
 * Issues the boleta electrónica (39) for a completed sale, or does nothing
 * if the organization hasn't enabled DTE. Idempotent and safely re-callable
 * at any time from just a saleId — both the immediate post-sale trigger
 * (SalesCommandService.processSale) and the retry cron call this exact same
 * entrypoint, re-deriving everything from the Sale/SaleItem rows rather than
 * requiring the original in-memory cart.
 *
 * Never throws for a provider-shaped failure (see emitDteDocument) — issuing
 * a boleta is a best-effort side effect of a sale, not a precondition for
 * one. A sale that already left the register must stay a completed sale
 * even if the SII/Openfactura is down; the boleta can always be retried.
 */
export class IssueDteForSale {
  constructor(
    private readonly deps: {
      organizationId: number;
      sales: SaleRepository;
      saleItems: SaleItemRepository;
      dteConfigs: DteConfigRepository;
      dteDocuments: DteDocumentRepository;
      buildProvider: DteProviderFactory;
    }
  ) {}

  async execute(input: IssueDteForSaleInput): Promise<DteDocument | null> {
    const config = await this.deps.dteConfigs.findByOrganizationId(this.deps.organizationId);
    if (!config || !config.enabled) {
      return null;
    }

    const existing = await this.deps.dteDocuments.findBySaleAndType(
      input.saleId,
      DTE_TYPE.BOLETA_AFECTA
    );
    if (existing && isTerminal(existing.status)) {
      return existing;
    }

    const sale = await this.deps.sales.findById(input.saleId);
    if (!sale) {
      throw new SaleNotFoundError(input.saleId);
    }
    const items = await this.deps.saleItems.findBySaleId(input.saleId);

    const totalAmount = centsToClp(sale.totalAmount);
    const { netAmount, taxAmount } = splitIva(totalAmount);
    const lineItems: DteBoletaLineItem[] = items.map((item) => ({
      description: item.productName,
      quantity: item.quantity,
      unitPrice: centsToClp(item.unitPrice),
      totalPrice: centsToClp(item.subtotal),
    }));

    const document =
      existing ??
      (await this.deps.dteDocuments.create({
        organizationId: this.deps.organizationId,
        saleId: input.saleId,
        type: DTE_TYPE.BOLETA_AFECTA,
        status: DTE_STATUS.PENDING,
        environment: config.environment,
        netAmount,
        taxAmount,
        totalAmount,
        idempotencyKey: buildIdempotencyKey(this.deps.organizationId, input.saleId, DTE_TYPE.BOLETA_AFECTA),
      }));

    const provider = this.deps.buildProvider(config);
    return emitDteDocument(this.deps.dteDocuments, document, () =>
      provider.issueBoleta(
        {
          netAmount,
          taxAmount,
          totalAmount,
          items: lineItems,
          emissionDate: sale.completedAt ?? sale.createdAt,
        },
        document.idempotencyKey
      )
    );
  }
}

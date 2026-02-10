import type { Sale } from '@/core/domain/entities/Sale';
import type { SaleRepository } from '@/core/application/ports/SaleRepository';
import type { SaleItemRepository } from '@/core/application/ports/SaleItemRepository';
import { SaleNotFoundError } from '@/core/domain/errors/POSErrors';

export interface SaleDetail extends Sale {
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

/**
 * Use Case: Get Sale By ID
 * Retrieves a complete sale with its items
 */
export class GetSaleById {
  constructor(
    private readonly deps: {
      sales: SaleRepository;
      saleItems: SaleItemRepository;
    }
  ) {}

  async execute(saleId: string): Promise<SaleDetail> {
    // Get sale
    const sale = await this.deps.sales.findById(saleId);
    if (!sale) {
      throw new SaleNotFoundError(saleId);
    }

    // Get sale items
    const items = await this.deps.saleItems.findBySaleId(saleId);

    return {
      ...sale,
      items: items.map((item) => ({
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    };
  }
}

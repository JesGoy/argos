/**
 * SaleItem Domain Entity
 * Represents an individual item within a sale
 */
export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: Date;
}

/**
 * Input type for creating a sale item
 */
export type CreateSaleItemInput = Omit<SaleItem, 'id' | 'createdAt'>;

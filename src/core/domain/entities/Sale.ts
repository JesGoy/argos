import type { PaymentMethod, SaleStatus } from '@/core/domain/constants/SaleConstants';

/**
 * Sale Domain Entity
 * Represents a completed or pending sale transaction
 */
export interface Sale {
  id: string;
  saleNumber: string;
  userId: number;
  customerId?: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input type for creating a new sale
 */
export type CreateSaleInput = Omit<Sale, 'id' | 'saleNumber' | 'createdAt' | 'updatedAt'>;

/**
 * Input type for updating a sale
 */
export type UpdateSaleInput = Partial<Omit<Sale, 'id' | 'saleNumber' | 'createdAt' | 'updatedAt'>>;

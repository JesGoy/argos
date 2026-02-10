import { z } from 'zod';
import { PAYMENT_METHODS, SALE_STATUSES } from '@/core/domain/constants/SaleConstants';
import { TRANSACTION_TYPES } from '@/core/domain/constants/StockConstants';

/**
 * Schema for creating a sale
 */
export const createSaleSchema = z.object({
  items: z.array(
    z.object({
      sku: z.string().min(1, 'SKU es requerido'),
      quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
    })
  ).min(1, 'Debe incluir al menos un producto'),
  
  paymentMethod: z.enum(PAYMENT_METHODS, {
    message: 'Método de pago inválido',
  }),
  
  customerId: z.string().optional(),
  
  notes: z.string().max(1000).optional(),
});

/**
 * Schema for adjusting stock
 */
export const adjustStockSchema = z.object({
  productId: z.string().min(1, 'ID de producto es requerido'),
  
  type: z.enum(TRANSACTION_TYPES.filter(t => t !== 'sale') as ['purchase', 'adjustment', 'return'], {
    message: 'Tipo de transacción inválido',
  }),
  
  quantity: z.number().int().refine((val) => val !== 0, {
    message: 'La cantidad no puede ser cero',
  }),
  
  reason: z.string().min(1, 'Razón es requerida').max(500),
  
  referenceNumber: z.string().max(100).optional(),
});

/**
 * Schema for creating a customer
 */
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(200),
  
  phone: z.string().max(20).optional(),
  
  email: z.string().email('Email inválido').max(100).optional(),
  
  address: z.string().max(1000).optional(),
  
  creditLimit: z.number().int().min(0, 'Límite de crédito debe ser positivo').default(0),
});

/**
 * Schema for updating a customer
 */
export const updateCustomerSchema = createCustomerSchema.partial();

/**
 * Schema for sale filters
 */
export const saleFiltersSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(SALE_STATUSES).optional(),
  userId: z.number().int().optional(),
  customerId: z.string().optional(),
});

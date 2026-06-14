import { z } from 'zod';

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  phone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Email inválido').max(100).optional().or(z.literal('')),
  leadTimeDays: z.coerce
    .number()
    .int('Debe ser un número entero')
    .min(0, 'No puede ser negativo')
    .max(365, 'Demasiado alto')
    .default(7),
});

export type SupplierSchema = z.infer<typeof supplierSchema>;

export const stockInSchema = z.object({
  sku: z.string().min(1, 'SKU requerido'),
  quantity: z.coerce
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser positiva'),
  supplierId: z.string().optional().or(z.literal('')),
  perUnitCost: z.coerce
    .number()
    .min(0, 'No puede ser negativo')
    .optional()
    .or(z.literal('')),
  reason: z.string().max(500).optional().or(z.literal('')),
  referenceNumber: z.string().max(100).optional().or(z.literal('')),
});

export type StockInSchema = z.infer<typeof stockInSchema>;

import { z } from 'zod';
import { WASTE_REASONS } from '@/core/domain/constants/StockConstants';

/**
 * Validation for recording merma (waste) from the manual UI.
 */
export const wasteSchema = z.object({
  sku: z.string().min(1, 'SKU requerido'),
  quantity: z.coerce
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser positiva'),
  category: z.enum(WASTE_REASONS, { message: 'Categoría de merma inválida' }),
  reason: z.string().max(500).optional(),
});

export type WasteSchema = z.infer<typeof wasteSchema>;

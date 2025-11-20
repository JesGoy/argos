import { z } from 'zod';

/**
 * Unit enum for validation
 */
export const unitSchema = z.enum(['pcs', 'kg', 'liter', 'meter', 'box'], {
  message: 'Unidad inválida',
});

/**
 * Schema for creating a product
 */
export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU es requerido')
    .max(50, 'SKU no puede exceder 50 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'SKU debe contener solo letras mayúsculas, números y guiones'),
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(200, 'Nombre no puede exceder 200 caracteres'),
  description: z
    .string()
    .max(1000, 'Descripción no puede exceder 1000 caracteres')
    .optional(),
  category: z
    .string()
    .min(1, 'Categoría es requerida')
    .max(100, 'Categoría no puede exceder 100 caracteres'),
  unit: unitSchema,
  minStock: z
    .number()
    .int('Stock mínimo debe ser un número entero')
    .min(0, 'Stock mínimo no puede ser negativo')
    .default(0),
  reorderPoint: z
    .number()
    .int('Punto de reorden debe ser un número entero')
    .min(0, 'Punto de reorden no puede ser negativo')
    .default(10),
});

/**
 * Schema for updating a product
 */
export const updateProductSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU es requerido')
    .max(50, 'SKU no puede exceder 50 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'SKU debe contener solo letras mayúsculas, números y guiones')
    .optional(),
  name: z
    .string()
    .min(1, 'Nombre es requerido')
    .max(200, 'Nombre no puede exceder 200 caracteres')
    .optional(),
  description: z
    .string()
    .max(1000, 'Descripción no puede exceder 1000 caracteres')
    .optional(),
  category: z
    .string()
    .min(1, 'Categoría es requerida')
    .max(100, 'Categoría no puede exceder 100 caracteres')
    .optional(),
  unit: unitSchema.optional(),
  minStock: z
    .number()
    .int('Stock mínimo debe ser un número entero')
    .min(0, 'Stock mínimo no puede ser negativo')
    .optional(),
  reorderPoint: z
    .number()
    .int('Punto de reorden debe ser un número entero')
    .min(0, 'Punto de reorden no puede ser negativo')
    .optional(),
});

/**
 * Schema for product filters
 */
export const productFiltersSchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
});

/**
 * Inferred types
 */
export type CreateProductSchema = z.infer<typeof createProductSchema>;
export type UpdateProductSchema = z.infer<typeof updateProductSchema>;
export type ProductFiltersSchema = z.infer<typeof productFiltersSchema>;

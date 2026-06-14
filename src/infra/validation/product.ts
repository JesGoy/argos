import { z } from 'zod';
import { PRODUCT_DEFAULTS, PRODUCT_UNITS } from '@/core/domain/constants/ProductConstants';
import { toCents } from '@/config/money';

/**
 * Money input collected in major units (e.g. 15.50) and stored as integer cents.
 */
const moneyInput = z.coerce
  .number()
  .min(0, 'El monto no puede ser negativo')
  .transform(toCents);

/**
 * Unit enum for validation
 */
export const unitSchema = z.enum(PRODUCT_UNITS, {
  message: 'Unidad inválida',
});

function normalizeRequiredText(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeCreateProductInput(rawData: Record<string, unknown>) {
  return {
    sku: normalizeRequiredText(rawData.sku),
    name: normalizeRequiredText(rawData.name),
    description: normalizeOptionalText(rawData.description),
    category: normalizeRequiredText(rawData.category),
    unit: rawData.unit ?? PRODUCT_UNITS[0],
    unitCost: rawData.unitCost ?? 0,
    sellingPrice: rawData.sellingPrice ?? 0,
    isComposite: rawData.isComposite === 'on' || rawData.isComposite === true,
    minStock: rawData.minStock ?? PRODUCT_DEFAULTS.MIN_STOCK,
    reorderPoint: rawData.reorderPoint ?? PRODUCT_DEFAULTS.REORDER_POINT,
  };
}

export function normalizeUpdateProductInput(rawData: Record<string, unknown>) {
  const normalizedData: Record<string, unknown> = {};

  if (rawData.sku !== undefined) {
    normalizedData.sku = normalizeRequiredText(rawData.sku);
  }
  if (rawData.name !== undefined) {
    normalizedData.name = normalizeRequiredText(rawData.name);
  }
  if (rawData.description !== undefined) {
    normalizedData.description = normalizeOptionalText(rawData.description);
  }
  if (rawData.category !== undefined) {
    normalizedData.category = normalizeRequiredText(rawData.category);
  }
  if (rawData.unit !== undefined) {
    normalizedData.unit = rawData.unit;
  }
  if (rawData.unitCost !== undefined) {
    normalizedData.unitCost = rawData.unitCost;
  }
  if (rawData.sellingPrice !== undefined) {
    normalizedData.sellingPrice = rawData.sellingPrice;
  }
  if (rawData.isComposite !== undefined) {
    normalizedData.isComposite = rawData.isComposite === 'on' || rawData.isComposite === true;
  }
  if (rawData.minStock !== undefined) {
    normalizedData.minStock = rawData.minStock;
  }
  if (rawData.reorderPoint !== undefined) {
    normalizedData.reorderPoint = rawData.reorderPoint;
  }

  return normalizedData;
}

export function parseCreateProductInput(rawData: Record<string, unknown>) {
  return createProductSchema.safeParse(normalizeCreateProductInput(rawData));
}

export function parseUpdateProductInput(rawData: Record<string, unknown>) {
  return updateProductSchema.safeParse(normalizeUpdateProductInput(rawData));
}

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
  unitCost: moneyInput.default(0),
  sellingPrice: moneyInput.default(0),
  isComposite: z.boolean().default(false),
  minStock: z
    .coerce.number()
    .int('Stock mínimo debe ser un número entero')
    .min(0, 'Stock mínimo no puede ser negativo')
    .default(PRODUCT_DEFAULTS.MIN_STOCK),
  reorderPoint: z
    .coerce.number()
    .int('Punto de reorden debe ser un número entero')
    .min(0, 'Punto de reorden no puede ser negativo')
    .default(PRODUCT_DEFAULTS.REORDER_POINT),
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
  unitCost: moneyInput.optional(),
  sellingPrice: moneyInput.optional(),
  isComposite: z.boolean().optional(),
  minStock: z
    .coerce.number()
    .int('Stock mínimo debe ser un número entero')
    .min(0, 'Stock mínimo no puede ser negativo')
    .optional(),
  reorderPoint: z
    .coerce.number()
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

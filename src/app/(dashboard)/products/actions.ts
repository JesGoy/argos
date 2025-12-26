'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  makeCreateProduct,
  makeUpdateProduct,
  makeDeleteProduct,
} from '@/infra/container/products';
import { createProductSchema, updateProductSchema } from '@/infra/validation/product';
import {
  ProductNotFoundError,
  DuplicateSKUError,
} from '@/core/domain/errors/ProductErrors';
import { requireRole } from '@/app/lib/auth';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';

/**
 * State type for product form actions
 */
export type ProductFormState = {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    sku?: string[];
    name?: string[];
    description?: string[];
    category?: string[];
    unit?: string[];
    minStock?: string[];
    reorderPoint?: string[];
  };
};

/**
 * Server Action: Create Product
 */
export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireRole(['admin', 'warehouse_manager', 'operator']);

  const rawData = {
    sku: formData.get('sku'),
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    category: formData.get('category'),
    unit: formData.get('unit'),
    minStock: formData.get('minStock') ? Number(formData.get('minStock')) : 0,
    reorderPoint: formData.get('reorderPoint') ? Number(formData.get('reorderPoint')) : 10,
  };

  const parsed = createProductSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const useCase = makeCreateProduct();
    await useCase.execute(parsed.data);
    revalidatePath('/products');
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { error: err.message };
    }
    if (err instanceof DuplicateSKUError) {
      return { error: err.message };
    }
    return { error: 'Error al crear el producto' };
  }
}

/**
 * Server Action: Update Product
 */
export async function updateProductAction(
  id: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireRole(['admin', 'warehouse_manager', 'operator']);

  const rawData: Record<string, unknown> = {};

  const sku = formData.get('sku');
  if (sku) rawData.sku = sku;

  const name = formData.get('name');
  if (name) rawData.name = name;

  const description = formData.get('description');
  if (description) rawData.description = description;

  const category = formData.get('category');
  if (category) rawData.category = category;

  const unit = formData.get('unit');
  if (unit) rawData.unit = unit;

  const minStock = formData.get('minStock');
  if (minStock) rawData.minStock = Number(minStock);

  const reorderPoint = formData.get('reorderPoint');
  if (reorderPoint) rawData.reorderPoint = Number(reorderPoint);

  const parsed = updateProductSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const useCase = makeUpdateProduct();
    await useCase.execute(id, parsed.data);
    revalidatePath('/products');
    revalidatePath(`/products/${id}`);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { error: err.message };
    }
    if (err instanceof ProductNotFoundError) {
      return { error: err.message };
    }
    if (err instanceof DuplicateSKUError) {
      return { error: err.message };
    }
    return { error: 'Error al actualizar el producto' };
  }
}

/**
 * Server Action: Delete Product
 */
export async function deleteProductAction(id: string): Promise<{ error?: string }> {
  try {
    await requireRole(['admin', 'warehouse_manager', 'operator']);
    const useCase = makeDeleteProduct();
    await useCase.execute(id);
    revalidatePath('/products');
    redirect('/products');
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { error: err.message };
    }
    if (err instanceof ProductNotFoundError) {
      return { error: err.message };
    }
    return { error: 'Error al eliminar el producto' };
  }
}

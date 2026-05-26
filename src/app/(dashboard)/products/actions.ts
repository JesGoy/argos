'use server';

import { revalidatePath } from 'next/cache';
import { makeProductCommandService } from '@/infra/container/products';
import { parseCreateProductInput, parseUpdateProductInput } from '@/infra/validation/product';
import {
  ProductNotFoundError,
  DuplicateSKUError,
} from '@/core/domain/errors/ProductErrors';
import { requireRole } from '@/app/lib/auth';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { PRODUCT_MANAGEMENT_ROLES } from '@/core/domain/constants/UserConstants';

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

function revalidatePaths(paths: readonly string[]) {
  paths.forEach((path) => revalidatePath(path));
}

/**
 * Server Action: Create Product
 */
export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);

  const rawData = {
    sku: formData.get('sku'),
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    unit: formData.get('unit'),
    minStock: formData.get('minStock'),
    reorderPoint: formData.get('reorderPoint'),
  };

  const parsed = parseCreateProductInput(rawData);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const productCommands = makeProductCommandService();
    const result = await productCommands.create(
      {
        userId: session.userId,
        role: session.role,
        source: PRODUCT_COMMAND_SOURCE.MANUAL,
      },
      parsed.data
    );

    revalidatePaths(result.refreshPaths);
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
  const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);

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
  if (typeof minStock === 'string' && minStock.length > 0) {
    rawData.minStock = minStock;
  }

  const reorderPoint = formData.get('reorderPoint');
  if (typeof reorderPoint === 'string' && reorderPoint.length > 0) {
    rawData.reorderPoint = reorderPoint;
  }

  const parsed = parseUpdateProductInput(rawData);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const productCommands = makeProductCommandService();
    const result = await productCommands.updateById(
      {
        userId: session.userId,
        role: session.role,
        source: PRODUCT_COMMAND_SOURCE.MANUAL,
      },
      id,
      parsed.data
    );

    revalidatePaths(result.refreshPaths);
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
    const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);
    const productCommands = makeProductCommandService();
    const result = await productCommands.deleteById(
      {
        userId: session.userId,
        role: session.role,
        source: PRODUCT_COMMAND_SOURCE.MANUAL,
      },
      id
    );

    revalidatePaths(result.refreshPaths);
    return {};
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

'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { PRODUCT_MANAGEMENT_ROLES } from '@/core/domain/constants/UserConstants';
import { makeRecipeRepository } from '@/infra/container/products';

export interface RecipeActionState {
  success?: boolean;
  error?: string;
}

export async function addRecipeComponentAction(
  finishedProductId: string,
  _prevState: RecipeActionState,
  formData: FormData
): Promise<RecipeActionState> {
  const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);

  const ingredientProductId = String(formData.get('ingredientProductId') ?? '');
  const quantityPerUnit = Number(formData.get('quantityPerUnit'));

  if (!ingredientProductId) {
    return { error: 'Selecciona un ingrediente' };
  }
  if (ingredientProductId === finishedProductId) {
    return { error: 'Un producto no puede ser ingrediente de sí mismo' };
  }
  if (!Number.isInteger(quantityPerUnit) || quantityPerUnit <= 0) {
    return { error: 'La cantidad por unidad debe ser un entero positivo' };
  }

  try {
    const recipes = makeRecipeRepository(session.organizationId);
    await recipes.addComponent({ finishedProductId, ingredientProductId, quantityPerUnit });
    revalidatePath(`/products/${finishedProductId}/edit`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { error: 'Ese ingrediente ya está en la receta' };
    }
    return { error: 'No se pudo agregar el ingrediente' };
  }
}

export async function removeRecipeComponentAction(
  componentId: string,
  finishedProductId: string
): Promise<RecipeActionState> {
  const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);
  try {
    const recipes = makeRecipeRepository(session.organizationId);
    await recipes.removeComponent(componentId);
    revalidatePath(`/products/${finishedProductId}/edit`);
    return { success: true };
  } catch {
    return { error: 'No se pudo quitar el ingrediente' };
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { makeStockCommandService } from '@/infra/container/ai';
import { wasteSchema } from '@/infra/validation/waste';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';
import { InsufficientStockError } from '@/core/domain/errors/POSErrors';
import { APP_ROUTE } from '@/config/routes';

export interface WasteFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    sku?: string[];
    quantity?: string[];
    category?: string[];
    reason?: string[];
  };
}

export async function recordWasteAction(
  _prevState: WasteFormState,
  formData: FormData
): Promise<WasteFormState> {
  const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

  const parsed = wasteSchema.safeParse({
    sku: formData.get('sku'),
    quantity: formData.get('quantity'),
    category: formData.get('category'),
    reason: formData.get('reason') || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const stockCommands = makeStockCommandService(session.organizationId);
    await stockCommands.recordWaste(
      {
        userId: Number(session.userId),
        role: session.role,
        source: PRODUCT_COMMAND_SOURCE.MANUAL,
      },
      {
        sku: parsed.data.sku,
        quantity: parsed.data.quantity,
        category: parsed.data.category,
        reason: parsed.data.reason,
      }
    );

    revalidatePath(APP_ROUTE.MERMAS);
    revalidatePath(APP_ROUTE.PRODUCTS);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    if (err instanceof ProductNotFoundError) return { error: err.message };
    if (err instanceof InsufficientStockError) return { error: err.message };
    return { error: 'Error al registrar la merma' };
  }
}

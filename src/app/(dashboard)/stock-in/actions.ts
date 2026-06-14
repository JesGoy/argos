'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { makeStockCommandService } from '@/infra/container/ai';
import { stockInSchema } from '@/infra/validation/supplier';
import { toCents } from '@/config/money';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { ProductNotFoundError } from '@/core/domain/errors/ProductErrors';
import { STOCK_REVALIDATE_PATHS } from '@/config/routes';

export interface StockInFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: {
    sku?: string[];
    quantity?: string[];
    supplierId?: string[];
    perUnitCost?: string[];
    reason?: string[];
    referenceNumber?: string[];
  };
}

export async function recordStockInAction(
  _prev: StockInFormState,
  formData: FormData
): Promise<StockInFormState> {
  const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

  const parsed = stockInSchema.safeParse({
    sku: formData.get('sku'),
    quantity: formData.get('quantity'),
    supplierId: formData.get('supplierId') || undefined,
    perUnitCost: formData.get('perUnitCost') || undefined,
    reason: formData.get('reason') || undefined,
    referenceNumber: formData.get('referenceNumber') || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    const stock = makeStockCommandService(session.organizationId);
    const perUnitCostMajor = parsed.data.perUnitCost;
    const perUnitCost =
      typeof perUnitCostMajor === 'number' && perUnitCostMajor > 0
        ? toCents(perUnitCostMajor)
        : undefined;

    await stock.stockIn(
      {
        userId: Number(session.userId),
        role: session.role,
        source: PRODUCT_COMMAND_SOURCE.MANUAL,
      },
      {
        sku: parsed.data.sku,
        quantity: parsed.data.quantity,
        reason: (parsed.data.reason as string) || undefined,
        referenceNumber: (parsed.data.referenceNumber as string) || undefined,
        supplierId: (parsed.data.supplierId as string) || undefined,
        perUnitCost,
      }
    );

    for (const path of STOCK_REVALIDATE_PATHS) revalidatePath(path);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { error: err.message };
    if (err instanceof ProductNotFoundError) return { error: err.message };
    return { error: 'Error al registrar entrada de stock' };
  }
}

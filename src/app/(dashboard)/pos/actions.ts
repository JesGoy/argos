'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { makeProcessSale, makeAdjustStock } from '@/infra/container/sales';
import { createSaleSchema, adjustStockSchema } from '@/infra/validation/sale';
import type { ProcessSaleInput } from '@/core/application/usecases/sales/ProcessSale';
import type { AdjustStockInput } from '@/core/application/usecases/sales/AdjustStock';

export interface FormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  result?: any;
}

/**
 * Server Action: Process Sale
 */
export async function processSaleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    // Check authorization
    const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

    // Extract data
    const rawData = {
      items: JSON.parse(formData.get('items') as string),
      paymentMethod: formData.get('paymentMethod') as string,
      customerId: formData.get('customerId') as string | undefined,
      notes: formData.get('notes') as string | undefined,
    };

    // Validate
    const parsed = createSaleSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // Execute use case
    const useCase = makeProcessSale();
    const input: ProcessSaleInput = {
      ...parsed.data,
      userId: parseInt(session.userId, 10),
    };

    const result = await useCase.execute(input);

    revalidatePath('/pos');
    revalidatePath('/sales');

    return {
      success: true,
      result: {
        saleId: result.sale.id,
        saleNumber: result.sale.saleNumber,
        totalAmount: result.sale.totalAmount,
      },
    };
  } catch (err) {
    const error = err as Error;
    return {
      error: error.message || 'Error al procesar la venta',
    };
  }
}

/**
 * Server Action: Adjust Stock
 */
export async function adjustStockAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    // Check authorization
    const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

    // Extract data
    const rawData = {
      productId: formData.get('productId') as string,
      type: formData.get('type') as string,
      quantity: parseInt(formData.get('quantity') as string, 10),
      reason: formData.get('reason') as string,
      referenceNumber: formData.get('referenceNumber') as string | undefined,
    };

    // Validate
    const parsed = adjustStockSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // Execute use case
    const useCase = makeAdjustStock();
    const input: AdjustStockInput = {
      ...parsed.data,
      userId: parseInt(session.userId, 10),
    };

    const result = await useCase.execute(input);

    revalidatePath('/pos');
    revalidatePath('/products');

    return {
      success: true,
      result: {
        transactionId: result.id,
        productId: result.productId,
        quantity: result.quantity,
      },
    };
  } catch (err) {
    const error = err as Error;
    return {
      error: error.message || 'Error al ajustar el stock',
    };
  }
}

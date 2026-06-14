'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { makeSalesCommandService, makeAdjustStock } from '@/infra/container/sales';
import { SalesCommandService } from '@/core/application/usecases/sales/SalesCommandService';
import { createSaleSchema, adjustStockSchema } from '@/infra/validation/sale';
import type { AdjustStockInput } from '@/core/application/usecases/sales/AdjustStock';

export interface FormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  result?: {
    saleId?: string;
    saleNumber?: string;
    totalAmount?: number;
    transactionId?: string;
    productId?: string;
    quantity?: number;
  };
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
      customerId: (formData.get('customerId') as string | null) || undefined,
      notes: (formData.get('notes') as string | null) || undefined,
    };

    // Validate
    const parsed = createSaleSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    // Execute via the shared command service (role check + refresh paths).
    const salesCommands = makeSalesCommandService(session.organizationId);
    const actor = SalesCommandService.makeActor(
      parseInt(session.userId, 10),
      session.role,
      PRODUCT_COMMAND_SOURCE.MANUAL
    );

    const { data, refreshPaths } = await salesCommands.processSale(actor, parsed.data);

    refreshPaths.forEach((path) => revalidatePath(path));

    return {
      success: true,
      result: {
        saleId: data.sale.id,
        saleNumber: data.sale.saleNumber,
        totalAmount: data.sale.totalAmount,
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
    const useCase = makeAdjustStock(session.organizationId);
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

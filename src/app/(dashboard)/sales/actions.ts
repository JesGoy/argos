'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { PRODUCT_COMMAND_SOURCE } from '@/core/domain/constants/ProductConstants';
import { makeGetSalesReport, makeSalesCommandService } from '@/infra/container/sales';
import { SalesCommandService } from '@/core/application/usecases/sales/SalesCommandService';

export async function getSalesAction(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

  const useCase = makeGetSalesReport(session.organizationId);
  const result = await useCase.execute(filters);

  return result;
}

export interface CancelSaleState {
  success?: boolean;
  error?: string;
}

/**
 * Server Action: Cancel a sale (restores stock atomically) via the shared
 * SalesCommandService.
 */
export async function cancelSaleAction(saleId: string): Promise<CancelSaleState> {
  try {
    const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

    const salesCommands = makeSalesCommandService(session.organizationId);
    const actor = SalesCommandService.makeActor(
      parseInt(session.userId, 10),
      session.role,
      PRODUCT_COMMAND_SOURCE.MANUAL
    );

    const { refreshPaths } = await salesCommands.cancelSale(actor, saleId);
    refreshPaths.forEach((path) => revalidatePath(path));

    return { success: true };
  } catch (err) {
    const error = err as Error;
    return { error: error.message || 'No se pudo cancelar la venta' };
  }
}

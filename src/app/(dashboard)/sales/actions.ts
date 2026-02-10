'use server';

import { requireRole } from '@/app/lib/auth';
import { makeGetSalesReport } from '@/infra/container/sales';

export async function getSalesAction(filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  await requireRole(['admin', 'warehouse_manager', 'operator']);

  const useCase = makeGetSalesReport();
  const result = await useCase.execute(filters);

  return result;
}

import { getSession } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import {
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS,
  type PaymentMethod,
  type SaleStatus,
} from '@/core/domain/constants/SaleConstants';
import { makeGetSalesReport } from '@/infra/container/sales';
import { fromCents } from '@/config/money';
import { toCsv, csvResponse } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export/sales — CSV of all sales (org-scoped), one row per sale.
 */
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response('No autenticado', { status: 401 });
  }
  if (!SALES_AUTHORIZED_ROLES.includes(session.role)) {
    return new Response('No autorizado', { status: 403 });
  }

  // No pagination → export the full history.
  const { sales } = await makeGetSalesReport(session.organizationId).execute();

  const headers = [
    'Número',
    'Fecha',
    'Hora',
    'Total',
    'Método de pago',
    'Estado',
    'Productos',
    'Unidades',
  ];

  const rows = sales.map((sale) => {
    const created = new Date(sale.createdAt);
    const units = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    return [
      sale.saleNumber,
      created.toISOString().split('T')[0],
      created.toISOString().split('T')[1]?.slice(0, 8) ?? '',
      fromCents(sale.totalAmount),
      PAYMENT_METHOD_LABELS[sale.paymentMethod as PaymentMethod] ?? sale.paymentMethod,
      SALE_STATUS_LABELS[sale.status as SaleStatus] ?? sale.status,
      sale.items.length,
      units,
    ];
  });

  return csvResponse('ventas.csv', toCsv(headers, rows));
}

import { getSession } from '@/app/lib/auth';
import { PRODUCT_MANAGEMENT_ROLES } from '@/core/domain/constants/UserConstants';
import { PRODUCT_UNIT_LABELS } from '@/core/domain/constants/ProductConstants';
import { makeGetProductsWithStock } from '@/infra/container/products';
import { fromCents } from '@/config/money';
import { toCsv, csvResponse } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export/products — CSV of the full product catalog (org-scoped).
 */
export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return new Response('No autenticado', { status: 401 });
  }
  if (!PRODUCT_MANAGEMENT_ROLES.includes(session.role)) {
    return new Response('No autorizado', { status: 403 });
  }

  const products = await makeGetProductsWithStock(session.organizationId).execute();

  const headers = [
    'SKU',
    'Nombre',
    'Categoría',
    'Unidad',
    'Costo',
    'Precio',
    'Stock actual',
    'Stock mínimo',
    'Punto de reorden',
    'Compuesto',
  ];

  const rows = products.map((p) => [
    p.sku,
    p.name,
    p.category,
    PRODUCT_UNIT_LABELS[p.unit] ?? p.unit,
    fromCents(p.unitCost),
    fromCents(p.sellingPrice),
    p.currentStock,
    p.minStock,
    p.reorderPoint,
    p.isComposite ? 'Sí' : 'No',
  ]);

  return csvResponse('productos.csv', toCsv(headers, rows));
}

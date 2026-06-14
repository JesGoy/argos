import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { makeGetProductsWithStock } from '@/infra/container/products';
import { makeSupplierRepository } from '@/infra/container/suppliers';
import { StockInForm } from './StockInForm';

export const dynamic = 'force-dynamic';

export default async function StockInPage() {
  const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

  const [products, suppliers] = await Promise.all([
    makeGetProductsWithStock(session.organizationId).execute({}),
    makeSupplierRepository(session.organizationId).findAll(),
  ]);

  const productOptions = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    currentStock: p.currentStock,
  }));
  const supplierOptions = suppliers.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Entrada de stock</h1>
          <p className="mt-2 text-gray-600">
            Registra una compra o recepción. Opcionalmente asocia el proveedor y el costo unitario
            (esto actualiza el costo del producto para reportes de margen y mermas).
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <StockInForm products={productOptions} suppliers={supplierOptions} />
        </div>
      </div>
    </div>
  );
}

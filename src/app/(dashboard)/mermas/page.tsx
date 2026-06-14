import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { makeGetProductsWithStock } from '@/infra/container/products';
import { WasteForm } from './WasteForm';

export const dynamic = 'force-dynamic';

export default async function MermasPage() {
  const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

  const products = await makeGetProductsWithStock(session.organizationId).execute({});
  const options = products.map((p) => ({
    sku: p.sku,
    name: p.name,
    currentStock: p.currentStock,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Registrar Merma</h1>
          <p className="mt-2 text-gray-600">
            Registra producto perdido, vencido o desechado. Reduce el stock y queda tipificado para análisis.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <WasteForm products={options} />
        </div>
      </div>
    </div>
  );
}

import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { makeGetProducts } from '@/infra/container/products';
import { POSInterface } from './POSInterface';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
  await requireRole([...SALES_AUTHORIZED_ROLES]);

  const useCase = makeGetProducts();
  const products = await useCase.execute({});

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
            <p className="mt-2 text-gray-600">
              Gestiona las ventas y procesa transacciones
            </p>
          </div>
          <Link
            href="/sales"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Ver Historial
          </Link>
        </div>

        <POSInterface products={products.map(p => ({ ...p, currentStock: 0 }))} />
      </div>
    </div>
  );
}

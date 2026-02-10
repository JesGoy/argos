import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { makeGetSalesReport } from '@/infra/container/sales';
import { SalesList } from './SalesList';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
  await requireRole([...SALES_AUTHORIZED_ROLES]);

  const useCase = makeGetSalesReport();
  const { sales, stats } = await useCase.execute();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historial de Ventas</h1>
            <p className="mt-2 text-gray-600">
              Consulta las ventas realizadas y sus estadísticas
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Vendido Hoy</div>
            <div className="text-3xl font-bold text-gray-900">
              ${stats.totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Ventas Hoy</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalSales}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Ticket Promedio</div>
            <div className="text-3xl font-bold text-gray-900">
              ${Math.round(stats.averageTicket).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Sales List */}
        <SalesList sales={sales} />
      </div>
    </div>
  );
}

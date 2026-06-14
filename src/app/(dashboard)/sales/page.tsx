import { requireRole } from '@/app/lib/auth';
import { SALES_AUTHORIZED_ROLES } from '@/core/domain/constants/UserConstants';
import { makeGetSalesReport } from '@/infra/container/sales';
import { formatMoney } from '@/config/money';
import { getOrgFormatting } from '@/app/lib/org';
import { APP_ROUTE } from '@/config/routes';
import { PAGE_SIZE, parsePage, toLimitOffset, totalPages } from '@/config/pagination';
import { Pagination } from '@/components/Pagination';
import { SalesList } from './SalesList';

export const dynamic = 'force-dynamic';

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireRole([...SALES_AUTHORIZED_ROLES]);

  const page = parsePage((await searchParams).page);
  const { limit, offset } = toLimitOffset(page);

  const useCase = makeGetSalesReport(session.organizationId);
  const [{ sales, stats, total }, { currency, timezone }] = await Promise.all([
    useCase.execute({ limit, offset }),
    getOrgFormatting(session.organizationId),
  ]);
  const pageCount = totalPages(total, PAGE_SIZE);

  // Everyone who can reach this page is sales-authorized and may cancel.
  const canCancel = SALES_AUTHORIZED_ROLES.includes(session.role);

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
          <a
            href="/api/export/sales"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Exportar CSV
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Vendido Hoy</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatMoney(stats.totalAmount, currency)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Ventas Hoy</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalSales}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Ticket Promedio</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatMoney(Math.round(stats.averageTicket), currency)}
            </div>
          </div>
        </div>

        {/* Sales List */}
        <SalesList sales={sales} canCancel={canCancel} currency={currency} timezone={timezone} />

        <Pagination currentPage={page} totalPages={pageCount} basePath={APP_ROUTE.SALES} />
      </div>
    </div>
  );
}

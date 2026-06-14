import { makeGetProductsWithStock, makeProductRepository } from '@/infra/container/products';
import Link from 'next/link';
import { ProductList } from './ProductList';
import { logoutAction } from '@/app/(dashboard)/logout/actions';
import { requireRole } from '@/app/lib/auth';
import { PRODUCT_MANAGEMENT_ROLES } from '@/core/domain/constants/UserConstants';
import { APP_ROUTE } from '@/config/routes';
import { getOrgFormatting } from '@/app/lib/org';
import { PAGE_SIZE, parsePage, toLimitOffset, totalPages } from '@/config/pagination';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);

  const page = parsePage((await searchParams).page);
  const { limit, offset } = toLimitOffset(page);

  const useCase = makeGetProductsWithStock(session.organizationId);
  const repo = makeProductRepository(session.organizationId);

  // Page of products + catalog-wide stats (counted in SQL, not from the page).
  const [products, total, categories, lowStockCount, { currency }] = await Promise.all([
    useCase.execute({ limit, offset }),
    repo.count(),
    repo.countCategories(),
    repo.countLowStock(),
    getOrgFormatting(session.organizationId),
  ]);
  const pageCount = totalPages(total, PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
            <p className="mt-2 text-gray-600">
              Gestiona el catálogo de productos del inventario
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/export/products"
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Exportar CSV
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cerrar sesión
              </button>
            </form>
            <Link
              href="/products/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Nuevo Producto
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Productos</div>
            <div className="text-3xl font-bold text-gray-900">{total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Categorías</div>
            <div className="text-3xl font-bold text-gray-900">{categories}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Stock Bajo</div>
            <div className="text-3xl font-bold text-orange-600">{lowStockCount}</div>
          </div>
        </div>

        {/* Product List */}
        <ProductList products={products} currency={currency} />

        <Pagination currentPage={page} totalPages={pageCount} basePath={APP_ROUTE.PRODUCTS} />
      </div>
    </div>
  );
}

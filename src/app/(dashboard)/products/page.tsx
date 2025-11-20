import { makeGetProducts } from '@/infra/container/products';
import Link from 'next/link';
import { ProductList } from './ProductList';


export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const useCase = makeGetProducts();
  const products = await useCase.execute();

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
          <Link
            href="/products/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nuevo Producto
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Productos</div>
            <div className="text-3xl font-bold text-gray-900">{products.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Categorías</div>
            <div className="text-3xl font-bold text-gray-900">
              {new Set(products.map((p) => p.category)).size}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Stock Bajo</div>
            <div className="text-3xl font-bold text-orange-600">
              {products.filter((p) => p.minStock <= p.reorderPoint).length}
            </div>
          </div>
        </div>

        {/* Product List */}
        <ProductList products={products} />
      </div>
    </div>
  );
}

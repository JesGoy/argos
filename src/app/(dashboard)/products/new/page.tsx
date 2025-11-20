import { CreateProductForm } from './CreateProductForm';
import Link from 'next/link';

export default function NewProductPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/products" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← Volver a Productos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Producto</h1>
          <p className="mt-2 text-gray-600">
            Completa los datos para registrar un nuevo producto en el inventario
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <CreateProductForm />
        </div>
      </div>
    </div>
  );
}

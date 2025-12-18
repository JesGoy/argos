import { makeGetProductById } from '@/infra/container/products';
import EditProductForm from './EditProductForm';
import { notFound } from 'next/navigation';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const useCase = makeGetProductById();
  const product = await useCase.execute(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Editar Producto</h1>
          <p className="mt-2 text-gray-600">Actualiza los datos del producto</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <EditProductForm product={product} />
        </div>
      </div>
    </div>
  );
}

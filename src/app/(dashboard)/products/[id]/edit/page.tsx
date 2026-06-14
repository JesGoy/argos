import {
  makeGetProductById,
  makeGetProducts,
  makeRecipeRepository,
} from '@/infra/container/products';
import EditProductForm from './EditProductForm';
import { RecipeEditor } from './RecipeEditor';
import { notFound } from 'next/navigation';
import { requireRole } from '@/app/lib/auth';
import { PRODUCT_MANAGEMENT_ROLES } from '@/core/domain/constants/UserConstants';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const session = await requireRole([...PRODUCT_MANAGEMENT_ROLES]);
  const { id } = await params;
  const product = await makeGetProductById(session.organizationId).execute(id);

  if (!product) {
    notFound();
  }

  let recipeSection = null;
  if (product.isComposite) {
    const recipes = makeRecipeRepository(session.organizationId);
    const [components, allProducts] = await Promise.all([
      recipes.listDetailed(product.id),
      makeGetProducts(session.organizationId).execute(),
    ]);
    // Ingredients are simple (non-composite) products other than this finished good.
    const ingredientOptions = allProducts
      .filter((p) => p.id !== product.id && !p.isComposite)
      .map((p) => ({ id: p.id, sku: p.sku, name: p.name }));

    recipeSection = (
      <RecipeEditor
        finishedProductId={product.id}
        components={components}
        ingredientOptions={ingredientOptions}
      />
    );
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
          {recipeSection}
        </div>
      </div>
    </div>
  );
}

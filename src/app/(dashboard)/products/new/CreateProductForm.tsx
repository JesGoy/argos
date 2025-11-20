'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createProductAction, type ProductFormState } from '../actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const initialState: ProductFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Creando...' : 'Crear Producto'}
    </button>
  );
}

export function CreateProductForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(createProductAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.push('/products');
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {state.error}
        </div>
      )}

      {/* SKU */}
      <div>
        <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
          SKU <span className="text-red-500">*</span>
        </label>
        <input
          id="sku"
          name="sku"
          type="text"
          required
          placeholder="PROD-001"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {state.fieldErrors?.sku && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.sku[0]}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Solo letras mayúsculas, números y guiones
        </p>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Nombre del producto"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Descripción opcional del producto"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {state.fieldErrors?.description && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Categoría <span className="text-red-500">*</span>
        </label>
        <input
          id="category"
          name="category"
          type="text"
          required
          placeholder="Electrónica, Alimentos, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {state.fieldErrors?.category && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.category[0]}</p>
        )}
      </div>

      {/* Unit */}
      <div>
        <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
          Unidad <span className="text-red-500">*</span>
        </label>
        <select
          id="unit"
          name="unit"
          required
          defaultValue="pcs"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="pcs">Piezas (pcs)</option>
          <option value="kg">Kilogramos (kg)</option>
          <option value="liter">Litros (liter)</option>
          <option value="meter">Metros (meter)</option>
          <option value="box">Cajas (box)</option>
        </select>
        {state.fieldErrors?.unit && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.unit[0]}</p>
        )}
      </div>

      {/* Min Stock and Reorder Point */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="minStock" className="block text-sm font-medium text-gray-700 mb-1">
            Stock Mínimo
          </label>
          <input
            id="minStock"
            name="minStock"
            type="number"
            min="0"
            defaultValue="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {state.fieldErrors?.minStock && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.minStock[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="reorderPoint"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Punto de Reorden
          </label>
          <input
            id="reorderPoint"
            name="reorderPoint"
            type="number"
            min="0"
            defaultValue="10"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {state.fieldErrors?.reorderPoint && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.reorderPoint[0]}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <SubmitButton />
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

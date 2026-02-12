"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/core/domain/entities/Product";
import { updateProductAction, type ProductFormState } from "../../actions";

interface EditProductFormProps {
  product: Product;
}

export default function EditProductForm({ product }: EditProductFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<ProductFormState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    const result = await updateProductAction(product.id, {}, formData);
    setFormState(result);

    if (result.success) {
      setTimeout(() => {
        router.push("/products");
      }, 1000);
    }

    setIsSubmitting(false);
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* SKU - No editable */}
      <div>
        <label className="block text-sm font-medium text-gray-700">SKU</label>
        <input
          type="text"
          value={product.sku}
          disabled
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
        />
      </div>

      {/* Nombre */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre *
        </label>
        <input
          id="name"
          type="text"
          name="name"
          defaultValue={product.name}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500"
        />
        {formState.fieldErrors?.name && (
          <p className="mt-1 text-sm text-red-600">{formState.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={product.description}
          rows={4}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500"
        />
        {formState.fieldErrors?.description && (
          <p className="mt-1 text-sm text-red-600">{formState.fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Categoría *
        </label>
        <input
          id="category"
          type="text"
          name="category"
          defaultValue={product.category}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500"
        />
        {formState.fieldErrors?.category && (
          <p className="mt-1 text-sm text-red-600">{formState.fieldErrors.category[0]}</p>
        )}
      </div>

      {/* Unidad */}
      <div>
        <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
          Unidad *
        </label>
        <select
          id="unit"
          name="unit"
          defaultValue={product.unit}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500"
        >
          <option value="">Selecciona una unidad</option>
          <option value="pcs">Piezas (pcs)</option>
          <option value="kg">Kilogramos (kg)</option>
          <option value="liter">Litros (liter)</option>
          <option value="meter">Metros (meter)</option>
          <option value="box">Cajas (box)</option>
        </select>
        {formState.fieldErrors?.unit && (
          <p className="mt-1 text-sm text-red-600">{formState.fieldErrors.unit[0]}</p>
        )}
      </div>

      {/* Stock Mínimo */}
      <div>
        <label htmlFor="minStock" className="block text-sm font-medium text-gray-700">
          Stock Mínimo *
        </label>
        <input
          id="minStock"
          type="number"
          name="minStock"
          defaultValue={product.minStock}
          required
          min="0"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500"
        />
        {formState.fieldErrors?.minStock && (
          <p className="mt-1 text-sm text-red-600">{formState.fieldErrors.minStock[0]}</p>
        )}
      </div>

      {/* Punto de Reorden */}
      <div>
        <label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-700">
          Punto de Reorden *
        </label>
        <input
          id="reorderPoint"
          type="number"
          name="reorderPoint"
          defaultValue={product.reorderPoint}
          required
          min="0"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500"
        />
        {formState.fieldErrors?.reorderPoint && (
          <p className="mt-1 text-sm text-red-600">{formState.fieldErrors.reorderPoint[0]}</p>
        )}
      </div>

      {/* Mensajes de estado */}
      {formState.error && <p className="text-sm text-red-600">{formState.error}</p>}
      {formState.success && (
        <p className="text-sm text-green-600">Producto actualizado exitosamente</p>
      )}

      {/* Botón de envío */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-md hover:bg-gray-500"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

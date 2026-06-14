'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { RecipeComponentDetail } from '@/core/domain/entities/RecipeComponent';
import {
  addRecipeComponentAction,
  removeRecipeComponentAction,
  type RecipeActionState,
} from './recipeActions';

interface RecipeEditorProps {
  finishedProductId: string;
  components: RecipeComponentDetail[];
  ingredientOptions: Array<{ id: string; sku: string; name: string }>;
}

const initialState: RecipeActionState = {};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Agregando…' : 'Agregar ingrediente'}
    </button>
  );
}

export function RecipeEditor({ finishedProductId, components, ingredientOptions }: RecipeEditorProps) {
  const router = useRouter();
  const addAction = addRecipeComponentAction.bind(null, finishedProductId);
  const [state, formAction] = useActionState(addAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  const handleRemove = async (componentId: string) => {
    setRemovingId(componentId);
    try {
      await removeRecipeComponentAction(componentId, finishedProductId);
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold text-gray-900">Receta (ingredientes)</h2>
      <p className="mt-1 text-sm text-gray-600">
        Define cuánto de cada ingrediente consume una unidad de este producto. Al vender, se
        descuenta el stock de estos ingredientes.
      </p>

      <div className="mt-4 space-y-2">
        {components.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay ingredientes en la receta.</p>
        ) : (
          components.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2"
            >
              <span className="text-sm text-gray-800">
                {c.quantityPerUnit} × {c.ingredientName} ({c.ingredientSku})
              </span>
              <button
                type="button"
                onClick={() => handleRemove(c.id)}
                disabled={removingId === c.id}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                {removingId === c.id ? 'Quitando…' : 'Quitar'}
              </button>
            </div>
          ))
        )}
      </div>

      {ingredientOptions.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No hay otros productos disponibles para usar como ingredientes. Crea primero los insumos.
        </p>
      ) : (
        <form ref={formRef} action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="ingredientProductId" className="block text-sm font-medium text-gray-700 mb-1">
              Ingrediente
            </label>
            <select
              id="ingredientProductId"
              name="ingredientProductId"
              required
              defaultValue=""
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>
                Selecciona un insumo
              </option>
              {ingredientOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({opt.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label htmlFor="quantityPerUnit" className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad
            </label>
            <input
              id="quantityPerUnit"
              name="quantityPerUnit"
              type="number"
              min={1}
              step={1}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <AddButton />
        </form>
      )}

      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}

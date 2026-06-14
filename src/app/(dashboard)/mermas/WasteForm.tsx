'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { WASTE_REASONS, WASTE_REASON_LABELS } from '@/core/domain/constants/StockConstants';
import { recordWasteAction, type WasteFormState } from './actions';

interface WasteFormProps {
  products: Array<{ sku: string; name: string; currentStock: number }>;
}

const initialState: WasteFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Registrando…' : 'Registrar merma'}
    </button>
  );
}

export function WasteForm({ products }: WasteFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(recordWasteAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{state.error}</div>
      )}
      {state.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Merma registrada correctamente.
        </div>
      )}

      <div>
        <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
          Producto <span className="text-red-500">*</span>
        </label>
        <select
          id="sku"
          name="sku"
          required
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="" disabled>
            Selecciona un producto
          </option>
          {products.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.name} ({p.sku}) — stock: {p.currentStock}
            </option>
          ))}
        </select>
        {state.fieldErrors?.sku && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.sku[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad <span className="text-red-500">*</span>
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          {state.fieldErrors?.quantity && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.quantity[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={WASTE_REASONS[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {WASTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {WASTE_REASON_LABELS[r]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.category && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.category[0]}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
          Nota (opcional)
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={2}
          placeholder="Detalle adicional de la merma"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        {state.fieldErrors?.reason && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.reason[0]}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}

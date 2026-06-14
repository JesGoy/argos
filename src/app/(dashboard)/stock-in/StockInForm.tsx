'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { recordStockInAction, type StockInFormState } from './actions';

interface Props {
  products: Array<{ sku: string; name: string; currentStock: number }>;
  suppliers: Array<{ id: string; name: string }>;
}

const initialState: StockInFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Registrando…' : 'Registrar entrada'}
    </button>
  );
}

export function StockInForm({ products, suppliers }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(recordStockInAction, initialState);
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
          Entrada de stock registrada.
        </div>
      )}

      <div>
        <label htmlFor="si_sku" className="block text-sm font-medium text-gray-700 mb-1">
          Producto <span className="text-red-500">*</span>
        </label>
        <select
          id="si_sku"
          name="sku"
          required
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500"
        >
          <option value="" disabled>Selecciona un producto</option>
          {products.map((p) => (
            <option key={p.sku} value={p.sku}>
              {p.name} ({p.sku}) — stock: {p.currentStock}
            </option>
          ))}
        </select>
        {state.fieldErrors?.sku && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.sku[0]}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label htmlFor="si_qty" className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad <span className="text-red-500">*</span>
          </label>
          <input
            id="si_qty"
            name="quantity"
            type="number"
            min={1}
            step={1}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500"
          />
          {state.fieldErrors?.quantity && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.quantity[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="si_cost" className="block text-sm font-medium text-gray-700 mb-1">
            Costo unitario (opcional)
          </label>
          <input
            id="si_cost"
            name="perUnitCost"
            type="number"
            min={0}
            step="0.01"
            placeholder="Ej. 1200"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Si lo indicas, actualiza el costo unitario del producto.
          </p>
        </div>

        <div>
          <label htmlFor="si_supplier" className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor (opcional)
          </label>
          <select
            id="si_supplier"
            name="supplierId"
            defaultValue=""
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500"
          >
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="si_ref" className="block text-sm font-medium text-gray-700 mb-1">
            N° de referencia (opcional)
          </label>
          <input
            id="si_ref"
            name="referenceNumber"
            placeholder="Boleta, OC, factura"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label htmlFor="si_reason" className="block text-sm font-medium text-gray-700 mb-1">
            Nota (opcional)
          </label>
          <input
            id="si_reason"
            name="reason"
            placeholder="Motivo o detalle"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createSupplierAction, type SupplierFormState } from './actions';

const initialState: SupplierFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Guardando…' : 'Crear proveedor'}
    </button>
  );
}

export function SupplierForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(createSupplierAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{state.error}</div>
      )}
      {state.success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          Proveedor creado.
        </div>
      )}

      <div>
        <label htmlFor="s_name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="s_name"
          name="name"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
        />
        {state.fieldErrors?.name && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="s_phone" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
          <input
            id="s_phone"
            name="phone"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="s_email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="s_email"
            name="email"
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
          />
          {state.fieldErrors?.email && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email[0]}</p>}
        </div>
        <div>
          <label htmlFor="s_lead" className="block text-sm font-medium text-gray-700 mb-1">Lead time (días)</label>
          <input
            id="s_lead"
            name="leadTimeDays"
            type="number"
            min={0}
            max={365}
            defaultValue={7}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
          />
          {state.fieldErrors?.leadTimeDays && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.leadTimeDays[0]}</p>
          )}
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

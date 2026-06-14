'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  type BusinessType,
} from '@/core/domain/constants/OrganizationConstants';
import { updateSettingsAction, type SettingsFormState } from './actions';

interface SettingsFormProps {
  organization: {
    name: string;
    businessType: BusinessType;
    currency: string;
    timezone: string;
  };
}

const initialState: SettingsFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </button>
  );
}

export function SettingsForm({ organization }: SettingsFormProps) {
  const [state, formAction] = useActionState(updateSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{state.error}</div>
      )}
      {state.success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Configuración guardada.
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del negocio <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={organization.name}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de negocio <span className="text-red-500">*</span>
        </label>
        <select
          id="businessType"
          name="businessType"
          required
          defaultValue={organization.businessType}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {BUSINESS_TYPES.map((bt) => (
            <option key={bt} value={bt}>
              {BUSINESS_TYPE_LABELS[bt]}
            </option>
          ))}
        </select>
        {state.fieldErrors?.businessType && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.businessType[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Moneda (ISO) <span className="text-red-500">*</span>
          </label>
          <input
            id="currency"
            name="currency"
            type="text"
            required
            maxLength={3}
            defaultValue={organization.currency}
            placeholder="CLP"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {state.fieldErrors?.currency && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.currency[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
            Zona horaria <span className="text-red-500">*</span>
          </label>
          <input
            id="timezone"
            name="timezone"
            type="text"
            required
            defaultValue={organization.timezone}
            placeholder="America/Santiago"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {state.fieldErrors?.timezone && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.timezone[0]}</p>
          )}
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

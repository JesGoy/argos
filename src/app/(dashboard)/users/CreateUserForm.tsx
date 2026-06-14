'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  USER_ROLE,
  USER_ROLES,
  USER_ROLE_LABELS,
} from '@/core/domain/constants/UserConstants';
import { PlanLimitBanner } from '@/components/billing/PlanLimitBanner';
import { createUserAction, type CreateUserFormState } from './actions';

const initialState: CreateUserFormState = {};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Creando…' : 'Crear usuario'}
    </button>
  );
}

export function CreateUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(createUserAction, initialState);

  useEffect(() => {
    if (state.success) {
      // DOM reset + server refresh (not setState) so the new user appears in
      // the list and the inputs clear without tripping the effect lint rule.
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.limit && <PlanLimitBanner limit={state.limit} />}

      {state.error && !state.limit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          Usuario creado correctamente.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Usuario <span className="text-red-500">*</span>
          </label>
          <input id="username" name="username" type="text" required className={inputClass} />
          {state.fieldErrors?.username && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.username[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo <span className="text-red-500">*</span>
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo
          </label>
          <input id="fullName" name="fullName" type="text" className={inputClass} />
          {state.fieldErrors?.fullName && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.fullName[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Rol <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue={USER_ROLE.VIEWER}
            className={inputClass}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          {state.fieldErrors?.role && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.role[0]}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className={inputClass}
          />
          {state.fieldErrors?.password && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.password[0]}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">Mínimo 8 caracteres.</p>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

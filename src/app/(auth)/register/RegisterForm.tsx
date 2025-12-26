'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerAction, type RegisterActionState } from './actions';

const initialState: RegisterActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
      disabled={pending}
    >
      {pending ? 'Creando…' : 'Crear cuenta'}
    </button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-gray-700">
            Usuario
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            placeholder="jdoe"
            required
          />
          {state.fieldErrors?.username?.[0] && (
            <p className="text-sm text-red-600">{state.fieldErrors.username[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            placeholder="correo@ejemplo.com"
            required
          />
          {state.fieldErrors?.email?.[0] && (
            <p className="text-sm text-red-600">{state.fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            placeholder="••••••••"
            required
          />
          {state.fieldErrors?.password?.[0] && (
            <p className="text-sm text-red-600">{state.fieldErrors.password[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
            Nombre completo (opcional)
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            placeholder="Jane Doe"
          />
          {state.fieldErrors?.fullName?.[0] && (
            <p className="text-sm text-red-600">{state.fieldErrors.fullName[0]}</p>
          )}
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

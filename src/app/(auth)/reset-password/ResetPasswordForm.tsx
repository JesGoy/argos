'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { resetPasswordAction, type ResetPasswordActionState } from './actions';

const initialState: ResetPasswordActionState = {};

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initialState);
  const { pending } = useFormStatus();

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="pin" className="text-sm font-medium text-gray-700">PIN</label>
        <input
          id="pin"
          name="pin"
          type="text"
          inputMode="numeric"
          pattern="\\d{6}"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          placeholder="123456"
          required
        />
        {state.fieldErrors?.pin?.[0] && <p className="text-sm text-red-600">{state.fieldErrors.pin[0]}</p>}
      </div>

      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">Nueva contraseña</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          placeholder="••••••••"
          required
        />
        {state.fieldErrors?.newPassword?.[0] && (
          <p className="text-sm text-red-600">{state.fieldErrors.newPassword[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirmar contraseña</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          placeholder="••••••••"
          required
        />
        {state.fieldErrors?.confirmPassword?.[0] && (
          <p className="text-sm text-red-600">{state.fieldErrors.confirmPassword[0]}</p>
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? 'Procesando…' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

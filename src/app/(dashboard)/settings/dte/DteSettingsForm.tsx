'use client';

import { useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  DTE_ENVIRONMENTS,
  DTE_ENVIRONMENT,
  DTE_ENVIRONMENT_LABELS,
  type DteEnvironment,
} from '@/core/domain/constants/DteConstants';
import {
  updateDteConfigAction,
  testDteConnectionAction,
  type DteSettingsFormState,
  type TestDteConnectionState,
} from './actions';

export interface DteConfigView {
  enabled: boolean;
  environment: DteEnvironment;
  rutEmisor: string;
  razonSocial: string;
  giro: string;
  acteco: string;
  direccion: string;
  comuna: string;
  /** Whether a production apikey is already saved (the real key is never sent back to the client). */
  hasApiKey: boolean;
}

interface DteSettingsFormProps {
  config: DteConfigView | null;
}

const initialState: DteSettingsFormState = {};

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

function TestConnectionButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TestDteConnectionState | null>(null);

  const handleClick = () => {
    startTransition(async () => {
      setResult(await testDteConnectionAction());
    });
  };

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
      <p className="text-sm text-blue-900">
        Emite una boleta de prueba ($1.000) contra el ambiente de pruebas de Openfactura. No
        requiere datos fiscales ni consume folios reales — es completamente gratis y seguro de
        repetir.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="mt-3 px-3 py-1.5 text-sm font-medium bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Emitiendo…' : 'Probar conexión'}
      </button>

      {result?.status === 'success' && (
        <div className="mt-3 text-sm text-green-800">
          ✔ Boleta de prueba emitida (folio {result.folio}).{' '}
          {result.pdfBase64 && (
            <a
              href={`data:application/pdf;base64,${result.pdfBase64}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline hover:text-green-900"
            >
              Ver boleta
            </a>
          )}
        </div>
      )}
      {result?.status === 'error' && (
        <p className="mt-3 text-sm text-red-700">{result.error}</p>
      )}
    </div>
  );
}

export function DteSettingsForm({ config }: DteSettingsFormProps) {
  const [state, formAction] = useActionState(updateDteConfigAction, initialState);
  const [environment, setEnvironment] = useState<DteEnvironment>(
    config?.environment ?? DTE_ENVIRONMENT.CERTIFICACION
  );
  const isProduccion = environment === DTE_ENVIRONMENT.PRODUCCION;

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

      <div className="flex items-center gap-3">
        <input
          id="enabled"
          name="enabled"
          type="checkbox"
          defaultChecked={config?.enabled ?? false}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
          Emitir boleta electrónica automáticamente en cada venta
        </label>
      </div>

      <div>
        <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-1">
          Ambiente
        </label>
        <select
          id="environment"
          name="environment"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value as DteEnvironment)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {DTE_ENVIRONMENTS.map((env) => (
            <option key={env} value={env}>
              {DTE_ENVIRONMENT_LABELS[env]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          En certificación, Argos emite contra el ambiente de pruebas de Openfactura usando su
          emisor de demostración — no necesitas tus datos fiscales todavía. Cambia a producción
          solo cuando tengas tu propia cuenta con Openfactura.
        </p>
      </div>

      {environment === DTE_ENVIRONMENT.CERTIFICACION && <TestConnectionButton />}

      {isProduccion && (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700">Datos fiscales</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rutEmisor" className="block text-sm font-medium text-gray-700 mb-1">
                RUT emisor
              </label>
              <input
                id="rutEmisor"
                name="rutEmisor"
                type="text"
                defaultValue={config?.rutEmisor}
                placeholder="76795561-8"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="acteco" className="block text-sm font-medium text-gray-700 mb-1">
                Código actividad económica (Acteco)
              </label>
              <input
                id="acteco"
                name="acteco"
                type="text"
                defaultValue={config?.acteco}
                placeholder="479100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="razonSocial" className="block text-sm font-medium text-gray-700 mb-1">
              Razón social
            </label>
            <input
              id="razonSocial"
              name="razonSocial"
              type="text"
              defaultValue={config?.razonSocial}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="giro" className="block text-sm font-medium text-gray-700 mb-1">
              Giro
            </label>
            <input
              id="giro"
              name="giro"
              type="text"
              defaultValue={config?.giro}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                id="direccion"
                name="direccion"
                type="text"
                defaultValue={config?.direccion}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="comuna" className="block text-sm font-medium text-gray-700 mb-1">
                Comuna
              </label>
              <input
                id="comuna"
                name="comuna"
                type="text"
                defaultValue={config?.comuna}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              API Key de Openfactura (producción)
            </label>
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder={config?.hasApiKey ? 'Ya configurada — deja en blanco para no cambiarla' : 'Pega tu API key de Openfactura'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

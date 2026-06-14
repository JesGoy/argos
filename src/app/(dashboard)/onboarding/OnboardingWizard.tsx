'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  type BusinessType,
} from '@/core/domain/constants/OrganizationConstants';
import { APP_ROUTE } from '@/config/routes';
import {
  saveProfileAction,
  loadDemoDataAction,
  type OnboardingProfileState,
  type DemoDataState,
} from './actions';

interface OnboardingWizardProps {
  organization: {
    name: string;
    businessType: BusinessType;
    currency: string;
    timezone: string;
  };
}

const initialProfileState: OnboardingProfileState = {};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

function SaveProfileButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Guardando…' : 'Guardar negocio'}
    </button>
  );
}

function StepCard({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function OnboardingWizard({ organization }: OnboardingWizardProps) {
  const router = useRouter();
  const [profileState, profileAction] = useActionState(saveProfileAction, initialProfileState);
  const [demoState, setDemoState] = useState<DemoDataState>({});
  const [isSeeding, startSeeding] = useTransition();

  const handleLoadDemo = () => {
    startSeeding(async () => {
      const result = await loadDemoDataAction();
      setDemoState(result);
      if (result.success) router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <StepCard
        step={1}
        title="Configura tu negocio"
        description="Define el tipo de negocio, la moneda y la zona horaria. Puedes cambiarlo luego en Configuración."
      >
        <form action={profileAction} className="space-y-4">
          {profileState.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {profileState.error}
            </div>
          )}
          {profileState.success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
              Datos del negocio guardados.
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
              className={inputClass}
            />
            {profileState.fieldErrors?.name && (
              <p className="mt-1 text-sm text-red-600">{profileState.fieldErrors.name[0]}</p>
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
              className={inputClass}
            >
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {BUSINESS_TYPE_LABELS[bt]}
                </option>
              ))}
            </select>
            {profileState.fieldErrors?.businessType && (
              <p className="mt-1 text-sm text-red-600">{profileState.fieldErrors.businessType[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                className={`${inputClass} uppercase`}
              />
              {profileState.fieldErrors?.currency && (
                <p className="mt-1 text-sm text-red-600">{profileState.fieldErrors.currency[0]}</p>
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
                className={inputClass}
              />
              {profileState.fieldErrors?.timezone && (
                <p className="mt-1 text-sm text-red-600">{profileState.fieldErrors.timezone[0]}</p>
              )}
            </div>
          </div>

          <SaveProfileButton />
        </form>
      </StepCard>

      <StepCard
        step={2}
        title="Carga datos de ejemplo (opcional)"
        description="Crea un catálogo de muestra con stock inicial para explorar el panel, el punto de venta y la analítica. Puedes eliminarlos cuando quieras."
      >
        {demoState.error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {demoState.error}
          </div>
        )}
        {demoState.success && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
            {demoState.created
              ? `Se crearon ${demoState.created} productos de ejemplo con stock inicial.`
              : 'Los datos de ejemplo ya estaban cargados.'}
            {demoState.skipped ? ` (${demoState.skipped} ya existían y se omitieron.)` : ''}
          </div>
        )}
        <button
          type="button"
          onClick={handleLoadDemo}
          disabled={isSeeding}
          className="px-4 py-2 border border-blue-600 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
        >
          {isSeeding ? 'Cargando…' : 'Cargar datos de ejemplo'}
        </button>
      </StepCard>

      <StepCard
        step={3}
        title="¡Listo!"
        description="Ya puedes empezar a usar Argos. Entra al panel para ver el resumen de tu negocio."
      >
        <Link
          href={APP_ROUTE.DASHBOARD}
          className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Ir al panel
        </Link>
      </StepCard>
    </div>
  );
}

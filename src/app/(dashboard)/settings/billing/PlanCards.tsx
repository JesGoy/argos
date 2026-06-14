'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { PlanType } from '@/core/domain/constants/BillingConstants';
import { changePlanAction, type BillingFormState } from './actions';

interface PlanCardData {
  plan: PlanType;
  label: string;
  priceLabel: string;
  limits: {
    users: string;
    products: string;
    aiCalls: string;
  };
}

interface PlanCardsProps {
  currentPlan: PlanType;
  plans: PlanCardData[];
}

const initialState: BillingFormState = {};

function ChangePlanButton({ targetPlan, isCurrent }: { targetPlan: PlanType; isCurrent: boolean }) {
  const { pending } = useFormStatus();

  if (isCurrent) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
      >
        Plan actual
      </button>
    );
  }

  return (
    <button
      type="submit"
      name="targetPlan"
      value={targetPlan}
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? 'Procesando…' : 'Cambiar a este plan'}
    </button>
  );
}

export function PlanCards({ currentPlan, plans }: PlanCardsProps) {
  const [state, formAction] = useActionState(changePlanAction, initialState);
  const [dismissedState, setDismissedState] = useState<BillingFormState | null>(null);
  const showToast = state.success === true && state.stubbed === true && dismissedState !== state;
  const toast = showToast ? 'Plan actualizado (modo demo, sin pago).' : null;

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setDismissedState(state), 4000);
    return () => clearTimeout(t);
  }, [showToast, state]);

  return (
    <div className="space-y-4">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.plan === currentPlan;
          return (
            <div
              key={p.plan}
              className={`rounded-xl border bg-white p-6 shadow-sm flex flex-col ${
                isCurrent ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{p.label}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Actual
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">{p.priceLabel}</p>

              <ul className="mt-4 space-y-2 text-sm text-gray-700 flex-1">
                <li>
                  <span className="font-semibold">{p.limits.users}</span> usuarios
                </li>
                <li>
                  <span className="font-semibold">{p.limits.products}</span> productos
                </li>
                <li>
                  <span className="font-semibold">{p.limits.aiCalls}</span> mensajes IA al mes
                </li>
              </ul>

              <form action={formAction} className="mt-6">
                <ChangePlanButton targetPlan={p.plan} isCurrent={isCurrent} />
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

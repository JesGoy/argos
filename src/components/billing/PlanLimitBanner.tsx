'use client';

import Link from 'next/link';
import { APP_ROUTE } from '@/config/routes';
import {
  PLAN_LABELS,
  PLAN_LIMIT_LABEL,
  type PlanLimitType,
  type PlanType,
} from '@/core/domain/constants/BillingConstants';

export interface PlanLimitInfo {
  limitType: PlanLimitType;
  current: number;
  max: number;
  plan: PlanType;
}

interface PlanLimitBannerProps {
  limit: PlanLimitInfo;
  /** Override the auto-generated message (optional). */
  message?: string;
}

function formatMax(max: number): string {
  return Number.isFinite(max) ? max.toLocaleString('es-CL') : '∞';
}

export function PlanLimitBanner({ limit, message }: PlanLimitBannerProps) {
  const text =
    message ??
    `Alcanzaste el límite de ${PLAN_LIMIT_LABEL[limit.limitType]} de tu plan ${PLAN_LABELS[limit.plan]} (${limit.current.toLocaleString('es-CL')}/${formatMax(limit.max)}).`;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">{text}</p>
        <Link
          href={APP_ROUTE.BILLING}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700"
        >
          Cambiar de plan
        </Link>
      </div>
    </div>
  );
}

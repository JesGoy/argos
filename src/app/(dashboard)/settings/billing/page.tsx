import { requireRole } from '@/app/lib/auth';
import {
  PLAN_LABELS,
  PLAN_LIMITS,
  PLAN_LIMIT_LABEL,
  PLAN_PRICE_USD,
  PLAN_TYPES,
  SUBSCRIPTION_STATUS_LABELS,
  type PlanLimitType,
  type PlanType,
} from '@/core/domain/constants/BillingConstants';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { makeGetSubscription } from '@/infra/container/billing';
import { getUserRepository } from '@/infra/container/auth';
import { makeProductRepository } from '@/infra/container/products';
import { PlanCards } from './PlanCards';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatLimit(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('es-CL') : 'Ilimitado';
}

function formatPrice(value: number): string {
  return value === 0 ? 'Gratis' : `US$${value}/mes`;
}

/**
 * Color thresholds match the low-stock badge convention used across the app:
 * green <80%, amber 80–99%, red ≥100% (or unlimited → always green).
 */
function usageColor(current: number, max: number): { bar: string; text: string } {
  if (!Number.isFinite(max)) return { bar: 'bg-emerald-500', text: 'text-emerald-700' };
  const pct = max === 0 ? 100 : (current / max) * 100;
  if (pct >= 100) return { bar: 'bg-red-500', text: 'text-red-700' };
  if (pct >= 80) return { bar: 'bg-amber-500', text: 'text-amber-700' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-700' };
}

function UsageRow({
  limitType,
  current,
  max,
}: {
  limitType: PlanLimitType;
  current: number;
  max: number;
}) {
  const color = usageColor(current, max);
  const pct = Number.isFinite(max) ? Math.min(100, max === 0 ? 100 : (current / max) * 100) : 6;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700 capitalize">
          {PLAN_LIMIT_LABEL[limitType]}
        </span>
        <span className={`text-sm font-semibold ${color.text}`}>
          {current.toLocaleString('es-CL')} / {formatLimit(max)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${color.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const session = await requireRole([USER_ROLE.ADMIN]);
  const orgId = session.organizationId;

  const [subscription, orgUsers, productCount] = await Promise.all([
    makeGetSubscription().execute(orgId),
    getUserRepository().findByOrganization(orgId),
    makeProductRepository(orgId).count(),
  ]);

  const usage: Record<PlanLimitType, number> = {
    users: orgUsers.length,
    products: productCount,
    aiCalls: subscription.aiCallsUsedThisPeriod,
  };

  const currentLimits = PLAN_LIMITS[subscription.plan];
  const caps: Record<PlanLimitType, number> = {
    users: currentLimits.users,
    products: currentLimits.products,
    aiCalls: currentLimits.aiCallsPerMonth,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
          <p className="mt-2 text-gray-600">
            Revisa tu plan actual, el uso del período y cámbialo cuando lo necesites.
          </p>
        </div>

        <section className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Plan actual
              </p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                {PLAN_LABELS[subscription.plan]}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Estado: <span className="font-medium text-gray-700">
                  {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                </span>
              </p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-medium text-gray-700">Período de facturación</p>
              <p>
                {dateFormatter.format(subscription.currentPeriodStart)} —{' '}
                {dateFormatter.format(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UsageRow limitType="users" current={usage.users} max={caps.users} />
            <UsageRow limitType="products" current={usage.products} max={caps.products} />
            <UsageRow limitType="aiCalls" current={usage.aiCalls} max={caps.aiCalls} />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cambiar de plan</h2>
            <p className="text-sm text-gray-600">
              El cambio es inmediato. En modo demo no se realiza ningún cobro real.
            </p>
          </div>

          <PlanCards
            currentPlan={subscription.plan}
            plans={PLAN_TYPES.map((plan: PlanType) => ({
              plan,
              label: PLAN_LABELS[plan],
              priceLabel: formatPrice(PLAN_PRICE_USD[plan]),
              limits: {
                users: formatLimit(PLAN_LIMITS[plan].users),
                products: formatLimit(PLAN_LIMITS[plan].products),
                aiCalls: formatLimit(PLAN_LIMITS[plan].aiCallsPerMonth),
              },
            }))}
          />
        </section>
      </div>
    </div>
  );
}

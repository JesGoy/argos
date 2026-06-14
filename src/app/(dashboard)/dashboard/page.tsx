import Link from 'next/link';
import { requireRole } from '@/app/lib/auth';
import { REPORT_VIEWER_ROLES, USER_ROLE } from '@/core/domain/constants/UserConstants';
import { makeGetDashboardKpis } from '@/infra/container/analytics';
import { makeProductRepository } from '@/infra/container/products';
import { formatMoney } from '@/config/money';
import { getOrgFormatting } from '@/app/lib/org';
import { APP_ROUTE } from '@/config/routes';
import type { DashboardKpis } from '@/core/application/usecases/analytics/GetDashboardKpis';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireRole([...REPORT_VIEWER_ROLES]);
  const [kpis, productCount, { currency }] = await Promise.all([
    makeGetDashboardKpis(session.organizationId).execute({ role: session.role }),
    makeProductRepository(session.organizationId).count(),
    getOrgFormatting(session.organizationId),
  ]);

  // A fresh org has no catalog yet — nudge the admin to the setup wizard.
  const showOnboarding = productCount === 0 && session.role === USER_ROLE.ADMIN;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Panel</h1>
          <p className="mt-1 text-gray-600">
            Resumen del negocio · últimos {kpis.period.days} días ({kpis.period.from} → {kpis.period.to})
          </p>
        </header>

        {showOnboarding && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-blue-900">Termina de configurar tu negocio</p>
                <p className="text-sm text-blue-800">
                  Aún no tienes productos. Completa la configuración inicial o carga datos de ejemplo.
                </p>
              </div>
              <Link
                href={APP_ROUTE.ONBOARDING}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Ir a primeros pasos
              </Link>
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Ventas de hoy"
            value={formatMoney(kpis.today.totalAmount, currency)}
            hint={`${kpis.today.totalSales} ventas · ticket ${formatMoney(kpis.today.averageTicket, currency)}`}
          />
          <KpiCard
            label={`Ventas ${kpis.period.days}d`}
            value={formatMoney(kpis.period.totalAmount, currency)}
            hint={`${kpis.period.totalSales} ventas · ticket ${formatMoney(kpis.period.averageTicket, currency)}`}
          />
          <KpiCard
            label={`Margen ${kpis.period.days}d`}
            value={formatMoney(kpis.margin.totalMargin, currency)}
            hint={`${kpis.margin.marginPct}% sobre ingresos · costo ${formatMoney(kpis.margin.totalCost, currency)}`}
            tone="positive"
          />
          <KpiCard
            label={`Merma ${kpis.period.days}d`}
            value={formatMoney(kpis.waste.totalCostCents, currency)}
            hint={`${kpis.waste.totalUnits} uds · ${kpis.waste.wasteRatePct}% sobre ventas`}
            tone={kpis.waste.wasteRatePct > 5 ? 'negative' : 'neutral'}
          />
        </section>

        <SalesTrend kpis={kpis} currency={currency} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopProducts kpis={kpis} currency={currency} />
          <StockoutRisk kpis={kpis} />
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const valueColor =
    tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function SalesTrend({ kpis, currency }: { kpis: DashboardKpis; currency: string }) {
  const points = kpis.salesTrend;
  const max = points.reduce((m, p) => Math.max(m, p.totalAmount), 0);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Tendencia de ventas</h2>
      {points.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Sin ventas en el período.</p>
      ) : (
        <div className="mt-4 flex h-32 items-end gap-1">
          {points.map((p) => {
            const heightPct = max > 0 ? Math.max(2, Math.round((p.totalAmount / max) * 100)) : 2;
            return (
              <div
                key={p.date}
                className="flex-1 rounded-t bg-blue-500/80 hover:bg-blue-600"
                style={{ height: `${heightPct}%` }}
                title={`${p.date}: ${formatMoney(p.totalAmount, currency)} (${p.totalSales} ventas)`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function TopProducts({ kpis, currency }: { kpis: DashboardKpis; currency: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Productos más vendidos</h2>
      {kpis.topProducts.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Sin ventas en el período.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {kpis.topProducts.map((p, i) => (
            <li
              key={p.productId}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <span className="text-sm text-gray-800">
                <span className="mr-2 font-semibold text-gray-400">{i + 1}.</span>
                {p.productName} <span className="text-gray-400">({p.sku})</span>
              </span>
              <span className="text-sm font-medium text-gray-900">
                {p.totalQuantity} uds · {formatMoney(p.totalRevenue, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StockoutRisk({ kpis }: { kpis: DashboardKpis }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Riesgo de quiebre de stock</h2>
      {kpis.stockoutRisk.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Ningún producto en riesgo. 👍</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {kpis.stockoutRisk.map((item) => {
            const cover =
              item.daysOfCover === null ? 'sin ventas recientes' : `~${item.daysOfCover} días`;
            return (
              <li
                key={item.productId}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/60 px-3 py-2"
              >
                <span className="text-sm text-gray-800">
                  {item.productName} <span className="text-gray-400">({item.sku})</span>
                </span>
                <span className="text-sm font-medium text-red-700">
                  {item.currentStock} uds · {cover}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

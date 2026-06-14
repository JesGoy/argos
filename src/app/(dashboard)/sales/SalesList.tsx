'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PAYMENT_METHOD_LABELS, SALE_STATUS, SALE_STATUS_LABELS, SALE_STATUS_COLORS } from '@/core/domain/constants/SaleConstants';
import type { SaleWithItems } from '@/core/application/usecases/sales/GetSalesReport';
import { formatMoney } from '@/config/money';
import { formatDate, formatTime } from '@/config/datetime';
import { cancelSaleAction } from './actions';

interface SalesListProps {
  sales: SaleWithItems[];
  /** Whether the current user may cancel sales (manage permission). */
  canCancel?: boolean;
  /** Org ISO 4217 currency for money display. */
  currency: string;
  /** Org IANA timezone for sale-date display. */
  timezone: string;
}

function CancelSaleButton({ saleId, saleNumber }: { saleId: string; saleNumber: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    if (!window.confirm(`¿Cancelar la venta ${saleNumber}? Se restaurará el stock de los productos.`)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await cancelSaleAction(saleId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        {isPending ? 'Cancelando…' : 'Cancelar'}
      </button>
      {error && <span className="mt-1 text-xs text-red-500">{error}</span>}
    </div>
  );
}

export function SalesList({ sales, canCancel = false, currency, timezone }: SalesListProps) {
  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No hay ventas registradas</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Número
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Productos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pago
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            {canCancel && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {sale.saleNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(sale.createdAt, timezone)}
                <br />
                <span className="text-xs text-gray-400">
                  {formatTime(sale.createdAt, timezone)}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {sale.items.map((item) => (
                  <div key={item.id} className="text-xs">
                    {item.quantity}x {item.productName}
                  </div>
                ))}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                {formatMoney(sale.totalAmount, currency)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {sale.status === SALE_STATUS.COMPLETED && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SALE_STATUS_COLORS.completed.bg} ${SALE_STATUS_COLORS.completed.text}`}>
                    {SALE_STATUS_LABELS.completed}
                  </span>
                )}
                {sale.status === SALE_STATUS.PENDING && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SALE_STATUS_COLORS.pending.bg} ${SALE_STATUS_COLORS.pending.text}`}>
                    {SALE_STATUS_LABELS.pending}
                  </span>
                )}
                {sale.status === SALE_STATUS.CANCELLED && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SALE_STATUS_COLORS.cancelled.bg} ${SALE_STATUS_COLORS.cancelled.text}`}>
                    {SALE_STATUS_LABELS.cancelled}
                  </span>
                )}
              </td>
              {canCancel && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {sale.status !== SALE_STATUS.CANCELLED ? (
                    <CancelSaleButton saleId={sale.id} saleNumber={sale.saleNumber} />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

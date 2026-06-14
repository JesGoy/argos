'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Supplier } from '@/core/domain/entities/Supplier';
import { deleteSupplierAction } from './actions';

interface Props {
  suppliers: Supplier[];
  canManage: boolean;
}

export function SupplierList({ suppliers, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (suppliers.length === 0) {
    return <p className="text-gray-600">Aún no hay proveedores. Crea el primero arriba.</p>;
  }

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`¿Eliminar proveedor "${name}"? Esta acción no se puede deshacer.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSupplierAction(id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="overflow-x-auto">
      {error && <div className="mb-3 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lead time</th>
            {canManage && (
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {suppliers.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-2 text-sm text-gray-900">{s.name}</td>
              <td className="px-4 py-2 text-sm text-gray-700">{s.phone ?? '—'}</td>
              <td className="px-4 py-2 text-sm text-gray-700">{s.email ?? '—'}</td>
              <td className="px-4 py-2 text-sm text-gray-700 text-right">{s.leadTimeDays} d</td>
              {canManage && (
                <td className="px-4 py-2 text-sm text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={pending}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

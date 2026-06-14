import { requireRole } from '@/app/lib/auth';
import {
  PRODUCT_MANAGEMENT_ROLES,
  SALES_AUTHORIZED_ROLES,
} from '@/core/domain/constants/UserConstants';
import { makeSupplierRepository } from '@/infra/container/suppliers';
import { SupplierForm } from './SupplierForm';
import { SupplierList } from './SupplierList';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
  const session = await requireRole([...SALES_AUTHORIZED_ROLES]);
  const repo = makeSupplierRepository(session.organizationId);
  const suppliers = await repo.findAll();

  const canManage = PRODUCT_MANAGEMENT_ROLES.includes(session.role);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Proveedores</h1>
          <p className="mt-2 text-gray-600">
            Administra los proveedores y sus tiempos de entrega (lead time) para mejorar las sugerencias de reposición.
          </p>
        </div>

        {canManage && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo proveedor</h2>
            <SupplierForm />
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4">
          <SupplierList suppliers={suppliers} canManage={canManage} />
        </div>
      </div>
    </div>
  );
}

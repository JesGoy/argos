import { requireRole } from '@/app/lib/auth';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { makeGetOrganization } from '@/infra/container/organizations';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await requireRole([USER_ROLE.ADMIN]);
  const organization = await makeGetOrganization().execute(String(session.organizationId));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="mt-2 text-gray-600">
            Ajusta los datos de tu negocio. El tipo de negocio define qué funciones se muestran
            (las cafeterías ven mermas y recetas).
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {organization ? (
            <SettingsForm
              organization={{
                name: organization.name,
                businessType: organization.businessType,
                currency: organization.currency,
                timezone: organization.timezone,
              }}
            />
          ) : (
            <p className="text-gray-500">No se encontró la organización.</p>
          )}
        </div>
      </div>
    </div>
  );
}

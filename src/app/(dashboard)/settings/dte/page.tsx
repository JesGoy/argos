import { requireRole } from '@/app/lib/auth';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { makeGetDteConfig } from '@/infra/container/dte';
import { DteSettingsForm } from './DteSettingsForm';

export const dynamic = 'force-dynamic';

export default async function DteSettingsPage() {
  const session = await requireRole([USER_ROLE.ADMIN]);
  const config = await makeGetDteConfig(session.organizationId).execute();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Boleta Electrónica</h1>
          <p className="mt-2 text-gray-600">
            Conecta Argos al SII para emitir boletas automáticamente en cada venta. Si tu negocio
            ya cumple de otra forma — por ejemplo, un POS de Transbank cuyo voucher es tu boleta —
            puedes dejar esto desactivado y seguir usando Argos con normalidad.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <DteSettingsForm
            config={
              config
                ? {
                    enabled: config.enabled,
                    environment: config.environment,
                    rutEmisor: config.rutEmisor ?? '',
                    razonSocial: config.razonSocial ?? '',
                    giro: config.giro ?? '',
                    acteco: config.acteco ?? '',
                    direccion: config.direccion ?? '',
                    comuna: config.comuna ?? '',
                    hasApiKey: !!config.apiKeyEncrypted,
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}

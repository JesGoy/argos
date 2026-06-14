import { requireRole } from '@/app/lib/auth';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { ORGANIZATION_DEFAULTS } from '@/core/domain/constants/OrganizationConstants';
import { makeGetOrganization } from '@/infra/container/organizations';
import { OnboardingWizard } from './OnboardingWizard';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const session = await requireRole([USER_ROLE.ADMIN]);
  const organization = await makeGetOrganization().execute(String(session.organizationId));

  const orgProfile = {
    name: organization?.name ?? '',
    businessType: organization?.businessType ?? ORGANIZATION_DEFAULTS.BUSINESS_TYPE,
    currency: organization?.currency ?? ORGANIZATION_DEFAULTS.CURRENCY,
    timezone: organization?.timezone ?? ORGANIZATION_DEFAULTS.TIMEZONE,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Bienvenido a Argos 👋</h1>
          <p className="mt-2 text-gray-600">
            Configuremos tu negocio en unos pasos. Toma menos de un minuto.
          </p>
        </header>

        <OnboardingWizard organization={orgProfile} />
      </div>
    </div>
  );
}

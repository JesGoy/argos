import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import { DashboardNav } from '@/components/DashboardNav';
import { makeGetOrganization } from '@/infra/container/organizations';
import { ORGANIZATION_DEFAULTS, type BusinessType } from '@/core/domain/constants/OrganizationConstants';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const organization = await makeGetOrganization().execute(String(session.organizationId));
  const businessType: BusinessType = organization?.businessType ?? ORGANIZATION_DEFAULTS.BUSINESS_TYPE;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardNav session={session} businessType={businessType} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

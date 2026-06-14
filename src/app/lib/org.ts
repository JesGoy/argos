import { makeGetOrganization } from '@/infra/container/organizations';
import { ORGANIZATION_DEFAULTS } from '@/core/domain/constants/OrganizationConstants';

export interface OrgFormatting {
  /** ISO 4217 currency code for money display. */
  currency: string;
  /** IANA timezone for date display. */
  timezone: string;
}

/**
 * Resolve the org's display preferences (currency + timezone) for a server
 * component, falling back to the platform defaults if the org row is missing.
 * Keeps the org fetch + fallback in one place so every page formats money and
 * dates consistently.
 */
export async function getOrgFormatting(organizationId: number): Promise<OrgFormatting> {
  const org = await makeGetOrganization().execute(String(organizationId));
  return {
    currency: org?.currency ?? ORGANIZATION_DEFAULTS.CURRENCY,
    timezone: org?.timezone ?? ORGANIZATION_DEFAULTS.TIMEZONE,
  };
}

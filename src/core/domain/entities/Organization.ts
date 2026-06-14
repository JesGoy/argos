import type { BusinessType } from '@/core/domain/constants/OrganizationConstants';

/**
 * Organization (tenant) Domain Entity
 */
export interface Organization {
  id: string;
  name: string;
  businessType: BusinessType;
  /** ISO 4217 currency code, e.g. 'CLP', 'USD'. */
  currency: string;
  /** IANA timezone, e.g. 'America/Santiago'. */
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationInput {
  name: string;
  businessType?: BusinessType;
  currency?: string;
  timezone?: string;
}

export type UpdateOrganizationInput = Partial<{
  name: string;
  businessType: BusinessType;
  currency: string;
  timezone: string;
}>;

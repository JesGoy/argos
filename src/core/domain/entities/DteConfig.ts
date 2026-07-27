import type { DteEnvironment, DteProviderName } from '@/core/domain/constants/DteConstants';

/**
 * DteConfig Domain Entity
 * One row per organization (1:1) — DTE issuance is opt-in per tenant. Some
 * organizations already comply another way (e.g. a Transbank terminal whose
 * card vouchers double as the boleta) and simply leave `enabled: false`.
 */
export interface DteConfig {
  id: number;
  organizationId: number;
  enabled: boolean;
  provider: DteProviderName;
  environment: DteEnvironment;
  /** AES-256-GCM ciphertext; the raw provider API key is never stored or logged. */
  apiKeyEncrypted?: string;
  /** Fiscal data below is only read/sent in `produccion` — `certificacion` always uses the provider's demo issuer. */
  rutEmisor?: string;
  razonSocial?: string;
  giro?: string;
  /** SII economic activity code (e.g. "479100") — required by factura/NC, not by boletas. */
  acteco?: string;
  direccion?: string;
  comuna?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateDteConfigInput = Omit<DteConfig, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateDteConfigInput = Partial<
  Omit<DteConfig, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
>;

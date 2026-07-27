import type { DteConfigRepository } from '@/core/application/ports/DteConfigRepository';
import type { ApiKeyEncryptor } from '@/core/application/ports/ApiKeyEncryptor';
import type { DteConfig } from '@/core/domain/entities/DteConfig';
import type { DteEnvironment } from '@/core/domain/constants/DteConstants';
import { DTE_PROVIDER } from '@/core/domain/constants/DteConstants';

export interface UpdateDteConfigInput {
  enabled: boolean;
  environment: DteEnvironment;
  rutEmisor?: string;
  razonSocial?: string;
  giro?: string;
  acteco?: string;
  direccion?: string;
  comuna?: string;
  /** New plaintext apikey to encrypt and store. Omitted = keep the existing one. */
  apiKey?: string;
}

/**
 * Use Case: Update Dte Config
 * Upserts the organization's DTE configuration (admin-only — enforced by the
 * caller via requireRole, same convention as UpdateOrganization). A new
 * apiKey is encrypted before it ever reaches the repository; omitting it on
 * an update keeps whatever was already saved, so re-saving fiscal data never
 * wipes a previously configured production key.
 */
export class UpdateDteConfig {
  constructor(
    private readonly deps: {
      organizationId: number;
      dteConfigs: DteConfigRepository;
      apiKeyEncryptor: ApiKeyEncryptor;
    }
  ) {}

  async execute(input: UpdateDteConfigInput): Promise<DteConfig> {
    const existing = await this.deps.dteConfigs.findByOrganizationId(this.deps.organizationId);
    const apiKeyEncrypted = input.apiKey
      ? this.deps.apiKeyEncryptor.encrypt(input.apiKey)
      : existing?.apiKeyEncrypted;

    const fields = {
      enabled: input.enabled,
      provider: DTE_PROVIDER.OPENFACTURA,
      environment: input.environment,
      apiKeyEncrypted,
      rutEmisor: input.rutEmisor,
      razonSocial: input.razonSocial,
      giro: input.giro,
      acteco: input.acteco,
      direccion: input.direccion,
      comuna: input.comuna,
    };

    if (existing) {
      return this.deps.dteConfigs.update(this.deps.organizationId, fields);
    }
    return this.deps.dteConfigs.create({ organizationId: this.deps.organizationId, ...fields });
  }
}

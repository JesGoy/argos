import type { DteConfigRepository } from '@/core/application/ports/DteConfigRepository';
import type { DteConfig } from '@/core/domain/entities/DteConfig';

/**
 * Use Case: Get Dte Config
 * Reads the organization's DTE configuration, or `null` if it was never set
 * up (an org with no row simply has DTE disabled — see DteConfig.ts).
 */
export class GetDteConfig {
  constructor(
    private readonly deps: {
      organizationId: number;
      dteConfigs: DteConfigRepository;
    }
  ) {}

  async execute(): Promise<DteConfig | null> {
    return this.deps.dteConfigs.findByOrganizationId(this.deps.organizationId);
  }
}

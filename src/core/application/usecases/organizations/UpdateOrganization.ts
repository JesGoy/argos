import type { UpdateOrganizationInput } from '@/core/domain/entities/Organization';
import type { OrganizationRepository } from '@/core/application/ports/OrganizationRepository';

/**
 * Use Case: Update Organization settings (name, businessType, currency, timezone).
 */
export class UpdateOrganization {
  constructor(private readonly deps: { organizations: OrganizationRepository }) {}

  async execute(id: string, input: UpdateOrganizationInput): Promise<void> {
    await this.deps.organizations.update(id, input);
  }
}

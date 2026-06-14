import type { Organization } from '@/core/domain/entities/Organization';
import type { OrganizationRepository } from '@/core/application/ports/OrganizationRepository';

/**
 * Use Case: Get Organization by id
 */
export class GetOrganization {
  constructor(private readonly deps: { organizations: OrganizationRepository }) {}

  async execute(id: string): Promise<Organization | null> {
    return this.deps.organizations.findById(id);
  }
}

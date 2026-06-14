import { OrganizationRepositoryDrizzle } from '@/infra/repositories/OrganizationRepositoryDrizzle';
import { GetOrganization } from '@/core/application/usecases/organizations/GetOrganization';
import { UpdateOrganization } from '@/core/application/usecases/organizations/UpdateOrganization';

export function makeGetOrganization() {
  return new GetOrganization({ organizations: new OrganizationRepositoryDrizzle() });
}

export function makeUpdateOrganization() {
  return new UpdateOrganization({ organizations: new OrganizationRepositoryDrizzle() });
}

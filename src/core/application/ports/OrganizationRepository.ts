import type {
  Organization,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@/core/domain/entities/Organization';

/**
 * Organization Repository Port
 */
export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  create(input: CreateOrganizationInput): Promise<Organization>;
  update(id: string, input: UpdateOrganizationInput): Promise<void>;
}

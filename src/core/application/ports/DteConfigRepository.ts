import type {
  DteConfig,
  CreateDteConfigInput,
  UpdateDteConfigInput,
} from '@/core/domain/entities/DteConfig';

/**
 * DteConfig Repository Port
 *
 * Org-scoped via the unique `organizationId` column (1:1 with Organization).
 */
export interface DteConfigRepository {
  findByOrganizationId(organizationId: number): Promise<DteConfig | null>;
  create(input: CreateDteConfigInput): Promise<DteConfig>;
  update(organizationId: number, patch: UpdateDteConfigInput): Promise<DteConfig>;
}

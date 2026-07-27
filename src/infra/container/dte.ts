import type { DteProvider } from '@/core/application/ports/DteProvider';
import type { DteConfig } from '@/core/domain/entities/DteConfig';
import { DTE_ENVIRONMENT, DTE_PROVIDER } from '@/core/domain/constants/DteConstants';
import { IssueDteForSale } from '@/core/application/usecases/dte/IssueDteForSale';
import { IssueCreditNoteForSale } from '@/core/application/usecases/dte/IssueCreditNoteForSale';
import { RetryPendingDtes } from '@/core/application/usecases/dte/RetryPendingDtes';
import { GetDteConfig } from '@/core/application/usecases/dte/GetDteConfig';
import { UpdateDteConfig } from '@/core/application/usecases/dte/UpdateDteConfig';
import { TestDteConnection } from '@/core/application/usecases/dte/TestDteConnection';
import { OpenfacturaDteProvider } from '@/infra/dte/OpenfacturaDteProvider';
import { DteConfigRepositoryDrizzle } from '@/infra/repositories/DteConfigRepositoryDrizzle';
import { DteDocumentRepositoryDrizzle } from '@/infra/repositories/DteDocumentRepositoryDrizzle';
import { DteRetryQueueRepositoryDrizzle } from '@/infra/repositories/DteRetryQueueRepositoryDrizzle';
import { SaleRepositoryDrizzle } from '@/infra/repositories/SaleRepositoryDrizzle';
import { SaleItemRepositoryDrizzle } from '@/infra/repositories/SaleItemRepositoryDrizzle';
import { decryptApiKey } from '@/infra/security/ApiKeyCipher';
import { ApiKeyCipherService } from '@/infra/security/ApiKeyCipherService';

/**
 * DteConfig is org-agnostic per method call (every method takes
 * organizationId), so a module-level singleton is fine — same reasoning as
 * container/billing.ts's subscription repo.
 */
let dteConfigRepoSingleton: DteConfigRepositoryDrizzle | null = null;
export function makeDteConfigRepository(): DteConfigRepositoryDrizzle {
  if (!dteConfigRepoSingleton) {
    dteConfigRepoSingleton = new DteConfigRepositoryDrizzle();
  }
  return dteConfigRepoSingleton;
}

export function makeDteDocumentRepository(organizationId: number): DteDocumentRepositoryDrizzle {
  return new DteDocumentRepositoryDrizzle(organizationId);
}

/**
 * Builds the DteProvider for an already-loaded DteConfig. `certificacion`
 * never touches the encrypted apikey or the organization's fiscal data —
 * Openfactura's sandbox always issues under its own public demo identity,
 * so every org (and Argos itself, pre-launch) can exercise the full flow
 * before any real SII certification exists.
 */
export function makeDteProvider(config: DteConfig): DteProvider {
  if (config.provider !== DTE_PROVIDER.OPENFACTURA) {
    throw new Error(`Proveedor DTE no soportado: ${config.provider}`);
  }

  if (config.environment === DTE_ENVIRONMENT.CERTIFICACION) {
    return new OpenfacturaDteProvider({ environment: DTE_ENVIRONMENT.CERTIFICACION });
  }

  return new OpenfacturaDteProvider({
    environment: DTE_ENVIRONMENT.PRODUCCION,
    apiKey: config.apiKeyEncrypted ? decryptApiKey(config.apiKeyEncrypted) : undefined,
    rutEmisor: config.rutEmisor,
    razonSocial: config.razonSocial,
    giro: config.giro,
    acteco: config.acteco,
    direccion: config.direccion,
    comuna: config.comuna,
  });
}

export function makeIssueDteForSale(organizationId: number): IssueDteForSale {
  return new IssueDteForSale({
    organizationId,
    sales: new SaleRepositoryDrizzle(organizationId),
    saleItems: new SaleItemRepositoryDrizzle(organizationId),
    dteConfigs: makeDteConfigRepository(),
    dteDocuments: makeDteDocumentRepository(organizationId),
    buildProvider: makeDteProvider,
  });
}

export function makeIssueCreditNoteForSale(organizationId: number): IssueCreditNoteForSale {
  return new IssueCreditNoteForSale({
    organizationId,
    dteConfigs: makeDteConfigRepository(),
    dteDocuments: makeDteDocumentRepository(organizationId),
    buildProvider: makeDteProvider,
  });
}

/**
 * System-level use case (not org-scoped) for the retry cron — see
 * DteRetryQueueRepository. Builds a fresh, org-scoped IssueDteForSale /
 * IssueCreditNoteForSale per candidate row's own organizationId.
 */
export function makeRetryPendingDtes(): RetryPendingDtes {
  return new RetryPendingDtes({
    retryQueue: new DteRetryQueueRepositoryDrizzle(),
    buildIssueDteForSale: makeIssueDteForSale,
    buildIssueCreditNoteForSale: makeIssueCreditNoteForSale,
  });
}

export function makeGetDteConfig(organizationId: number): GetDteConfig {
  return new GetDteConfig({ organizationId, dteConfigs: makeDteConfigRepository() });
}

export function makeUpdateDteConfig(organizationId: number): UpdateDteConfig {
  return new UpdateDteConfig({
    organizationId,
    dteConfigs: makeDteConfigRepository(),
    apiKeyEncryptor: new ApiKeyCipherService(),
  });
}

/**
 * Not org-scoped: the sandbox test always issues under Openfactura's public
 * demo identity, never the organization's own config — see TestDteConnection.
 */
export function makeTestDteConnection(): TestDteConnection {
  return new TestDteConnection({ buildProvider: makeDteProvider });
}

import { describe, it, expect, vi } from 'vitest';
import { UpdateDteConfig } from './UpdateDteConfig';
import { DTE_ENVIRONMENT, DTE_PROVIDER } from '@/core/domain/constants/DteConstants';
import type { DteConfigRepository } from '@/core/application/ports/DteConfigRepository';
import type { ApiKeyEncryptor } from '@/core/application/ports/ApiKeyEncryptor';
import type { DteConfig } from '@/core/domain/entities/DteConfig';

function makeExisting(overrides: Partial<DteConfig> = {}): DteConfig {
  return {
    id: 1,
    organizationId: 42,
    enabled: true,
    provider: DTE_PROVIDER.OPENFACTURA,
    environment: DTE_ENVIRONMENT.PRODUCCION,
    apiKeyEncrypted: 'ENC(old-key)',
    rutEmisor: '76795561-8',
    razonSocial: 'MI NEGOCIO SPA',
    giro: 'CAFETERIA',
    acteco: '479100',
    direccion: 'CALLE 123',
    comuna: 'Santiago',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeDeps(existing: DteConfig | null) {
  const dteConfigs = {
    findByOrganizationId: vi.fn().mockResolvedValue(existing),
    create: vi.fn().mockImplementation(async (input) => ({ id: 1, createdAt: new Date(), updatedAt: new Date(), ...input })),
    update: vi.fn().mockImplementation(async (_orgId: number, patch) => ({ ...(existing ?? {}), ...patch })),
  } satisfies DteConfigRepository;

  const apiKeyEncryptor = {
    encrypt: vi.fn().mockReturnValue('ENC(new-key)'),
    decrypt: vi.fn(),
  } satisfies ApiKeyEncryptor;

  const useCase = new UpdateDteConfig({ organizationId: 42, dteConfigs, apiKeyEncryptor });
  return { useCase, dteConfigs, apiKeyEncryptor };
}

describe('UpdateDteConfig', () => {
  it('creates a new config when none exists yet', async () => {
    const { useCase, dteConfigs } = makeDeps(null);

    await useCase.execute({ enabled: true, environment: DTE_ENVIRONMENT.CERTIFICACION });

    expect(dteConfigs.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 42, enabled: true, environment: DTE_ENVIRONMENT.CERTIFICACION })
    );
    expect(dteConfigs.update).not.toHaveBeenCalled();
  });

  it('updates an existing config in place', async () => {
    const existing = makeExisting();
    const { useCase, dteConfigs } = makeDeps(existing);

    await useCase.execute({ enabled: false, environment: DTE_ENVIRONMENT.PRODUCCION });

    expect(dteConfigs.update).toHaveBeenCalledWith(42, expect.objectContaining({ enabled: false }));
    expect(dteConfigs.create).not.toHaveBeenCalled();
  });

  it('keeps the existing encrypted apiKey when none is provided', async () => {
    const existing = makeExisting({ apiKeyEncrypted: 'ENC(old-key)' });
    const { useCase, dteConfigs, apiKeyEncryptor } = makeDeps(existing);

    await useCase.execute({ enabled: true, environment: DTE_ENVIRONMENT.PRODUCCION });

    expect(apiKeyEncryptor.encrypt).not.toHaveBeenCalled();
    expect(dteConfigs.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ apiKeyEncrypted: 'ENC(old-key)' })
    );
  });

  it('encrypts and stores a new apiKey when provided', async () => {
    const existing = makeExisting({ apiKeyEncrypted: 'ENC(old-key)' });
    const { useCase, dteConfigs, apiKeyEncryptor } = makeDeps(existing);

    await useCase.execute({
      enabled: true,
      environment: DTE_ENVIRONMENT.PRODUCCION,
      apiKey: 'plaintext-new-key',
    });

    expect(apiKeyEncryptor.encrypt).toHaveBeenCalledWith('plaintext-new-key');
    expect(dteConfigs.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ apiKeyEncrypted: 'ENC(new-key)' })
    );
  });
});

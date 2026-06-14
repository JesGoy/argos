import { describe, it, expect, vi } from 'vitest';
import { RegisterUser } from '@/core/application/usecases/auth/RegisterUser';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { DuplicateUserError } from '@/core/domain/errors/AuthErrors';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { OrganizationRepository } from '@/core/application/ports/OrganizationRepository';
import type { HashService } from '@/core/application/ports/HashService';
import type { SessionService } from '@/core/application/ports/SessionService';
import type { EnsureSubscription } from '@/core/application/usecases/billing/EnsureSubscription';

function makeStubs() {
  const users: UserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn().mockResolvedValue(undefined),
    findByUsername: vi.fn().mockResolvedValue(undefined),
    findByOrganization: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
  };
  const organizations: OrganizationRepository = {
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: '42',
      name: 'test org',
      businessType: 'food_service',
      currency: 'CLP',
      timezone: 'America/Santiago',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: vi.fn(),
  };
  const hash: HashService = {
    hash: vi.fn().mockResolvedValue('hashed'),
    compare: vi.fn(),
  };
  const session: SessionService = {
    sign: vi.fn().mockResolvedValue('signed-token'),
    verify: vi.fn(),
  };
  const ensureSubscription = {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as EnsureSubscription;
  return { users, organizations, hash, session, ensureSubscription };
}

describe('RegisterUser', () => {
  it('always assigns ADMIN role to the registering owner (no client-controlled role)', async () => {
    const deps = makeStubs();
    (deps.users.create as ReturnType<typeof vi.fn>).mockImplementation(async (input) => ({
      id: '1',
      ...input,
      createdAt: new Date(),
    }));
    const uc = new RegisterUser(deps);

    const out = await uc.execute({
      username: 'juan',
      email: 'juan@test.cl',
      password: 'secret123',
    });

    expect(deps.users.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: USER_ROLE.ADMIN })
    );
    expect(out.session.role).toBe(USER_ROLE.ADMIN);
    expect(out.token).toBe('signed-token');
  });

  it('rejects when email already exists', async () => {
    const deps = makeStubs();
    (deps.users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'x' });
    const uc = new RegisterUser(deps);

    await expect(
      uc.execute({ username: 'juan', email: 'juan@test.cl', password: 'secret123' })
    ).rejects.toBeInstanceOf(DuplicateUserError);
    expect(deps.users.create).not.toHaveBeenCalled();
  });

  it('rejects when username already exists', async () => {
    const deps = makeStubs();
    (deps.users.findByUsername as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'x' });
    const uc = new RegisterUser(deps);

    await expect(
      uc.execute({ username: 'juan', email: 'juan@test.cl', password: 'secret123' })
    ).rejects.toBeInstanceOf(DuplicateUserError);
  });

  it('uses default org name when organizationName is omitted', async () => {
    const deps = makeStubs();
    (deps.users.create as ReturnType<typeof vi.fn>).mockImplementation(async (input) => ({
      id: '1',
      ...input,
      createdAt: new Date(),
    }));
    const uc = new RegisterUser(deps);

    await uc.execute({ username: 'juan', email: 'juan@test.cl', password: 'secret123' });

    expect(deps.organizations.create).toHaveBeenCalledWith({ name: 'Negocio de juan' });
  });
});

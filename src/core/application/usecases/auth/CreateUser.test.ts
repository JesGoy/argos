import { describe, it, expect, vi } from 'vitest';
import { CreateUser } from './CreateUser';
import { EnforcePlanLimit } from '@/core/application/usecases/billing/EnforcePlanLimit';
import { PlanLimitExceededError } from '@/core/domain/errors/BillingErrors';
import { DuplicateUserError, UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import type { SessionData } from '@/core/application/ports/SessionService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { HashService } from '@/core/application/ports/HashService';
import type { GetSubscription } from '@/core/application/usecases/billing/GetSubscription';
import type { Subscription } from '@/core/domain/entities/Subscription';
import type { User } from '@/core/domain/entities/User';

function makeSession(role: SessionData['role']): SessionData {
  return {
    userId: 'admin-1',
    organizationId: 42,
    username: 'admin',
    email: 'admin@test.cl',
    role,
  };
}

function makeSub(plan: Subscription['plan'] = 'free'): Subscription {
  return {
    id: 1,
    organizationId: 42,
    plan,
    status: 'active',
    currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
    aiCallsUsedThisPeriod: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };
}

function makeDeps(opts: {
  plan?: Subscription['plan'];
  existingUsers?: number;
  emailTaken?: boolean;
  usernameTaken?: boolean;
}) {
  const users = {
    findById: vi.fn(),
    findByEmail: vi
      .fn()
      .mockResolvedValue(opts.emailTaken ? ({ id: 'x' } as User) : undefined),
    findByUsername: vi
      .fn()
      .mockResolvedValue(opts.usernameTaken ? ({ id: 'y' } as User) : undefined),
    findByOrganization: vi
      .fn()
      .mockResolvedValue(
        Array.from({ length: opts.existingUsers ?? 1 }, (_, i) => ({ id: String(i) }) as User),
      ),
    create: vi.fn().mockImplementation(async (input) => ({
      id: 'new-user',
      createdAt: new Date(),
      ...input,
    })),
    update: vi.fn(),
  } satisfies UserRepository;

  const hash = {
    hash: vi.fn().mockResolvedValue('hashed'),
    compare: vi.fn(),
  } satisfies HashService;

  const getSubscription = {
    execute: vi.fn().mockResolvedValue(makeSub(opts.plan ?? 'free')),
  } as unknown as GetSubscription;

  const enforcePlanLimit = new EnforcePlanLimit();

  const uc = new CreateUser({ users, hash, getSubscription, enforcePlanLimit });
  return { uc, users, hash, getSubscription };
}

const validInput = {
  username: 'teammate',
  email: 'teammate@test.cl',
  password: 'supersecret',
  role: USER_ROLE.VIEWER,
  fullName: 'Team Mate',
};

describe('CreateUser', () => {
  it('rejects non-admin actors with UnauthorizedError', async () => {
    const { uc, users } = makeDeps({ plan: 'pro', existingUsers: 1 });

    await expect(uc.execute(makeSession(USER_ROLE.VIEWER), validInput)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(users.create).not.toHaveBeenCalled();
  });

  it('rejects creating a user when the org is at the Free user cap (1)', async () => {
    const { uc, users } = makeDeps({ plan: 'free', existingUsers: 1 });

    await expect(uc.execute(makeSession(USER_ROLE.ADMIN), validInput)).rejects.toMatchObject({
      name: 'PlanLimitExceededError',
      limitType: 'users',
      current: 1,
      max: 1,
      plan: 'free',
    });
    expect(users.create).not.toHaveBeenCalled();
  });

  it('throws a PlanLimitExceededError instance at the cap', async () => {
    const { uc } = makeDeps({ plan: 'free', existingUsers: 1 });
    await expect(uc.execute(makeSession(USER_ROLE.ADMIN), validInput)).rejects.toBeInstanceOf(
      PlanLimitExceededError,
    );
  });

  it('allows creating a user on Pro when below the cap (5)', async () => {
    const { uc, users, hash } = makeDeps({ plan: 'pro', existingUsers: 1 });

    const created = await uc.execute(makeSession(USER_ROLE.ADMIN), validInput);

    expect(created.id).toBe('new-user');
    expect(hash.hash).toHaveBeenCalledWith('supersecret');
    expect(users.create).toHaveBeenCalledTimes(1);
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 42,
        username: 'teammate',
        email: 'teammate@test.cl',
        passwordHash: 'hashed',
        role: USER_ROLE.VIEWER,
        fullName: 'Team Mate',
      }),
    );
  });

  it('rejects a duplicate email with DuplicateUserError and does not create', async () => {
    const { uc, users } = makeDeps({ plan: 'pro', existingUsers: 1, emailTaken: true });

    await expect(uc.execute(makeSession(USER_ROLE.ADMIN), validInput)).rejects.toBeInstanceOf(
      DuplicateUserError,
    );
    expect(users.create).not.toHaveBeenCalled();
  });

  it('always scopes the new user to the actor organization (ignores any other org)', async () => {
    const { uc, users } = makeDeps({ plan: 'business', existingUsers: 1_000_000 });

    await uc.execute({ ...makeSession(USER_ROLE.ADMIN), organizationId: 7 }, validInput);

    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 7 }));
  });
});

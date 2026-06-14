import { describe, it, expect, vi } from 'vitest';
import { SetUserStatus } from './SetUserStatus';
import { UnauthorizedError } from '@/core/domain/errors/AuthErrors';
import { USER_ROLE, USER_STATUS } from '@/core/domain/constants/UserConstants';
import type { SessionData } from '@/core/application/ports/SessionService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { User } from '@/core/domain/entities/User';

function makeSession(role: SessionData['role'], userId = 'admin-1'): SessionData {
  return { userId, organizationId: 42, username: 'admin', email: 'a@test.cl', role };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u-2',
    organizationId: 42,
    username: 'teammate',
    email: 't@test.cl',
    passwordHash: 'hash',
    role: USER_ROLE.OPERATOR,
    status: USER_STATUS.ACTIVE,
    fullName: undefined,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeDeps(target: User | undefined) {
  const users = {
    findById: vi.fn().mockResolvedValue(target),
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    findByOrganization: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  } satisfies UserRepository;
  const uc = new SetUserStatus({ users });
  return { uc, users };
}

describe('SetUserStatus', () => {
  it('rejects non-admin actors', async () => {
    const { uc, users } = makeDeps(makeUser());
    await expect(
      uc.execute(makeSession(USER_ROLE.VIEWER), { targetUserId: 'u-2', status: USER_STATUS.SUSPENDED }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('rejects an invalid status value', async () => {
    const { uc, users } = makeDeps(makeUser());
    await expect(
      uc.execute(makeSession(USER_ROLE.ADMIN), {
        targetUserId: 'u-2',
        status: 'banished' as never,
      }),
    ).rejects.toThrow('Estado inválido');
    expect(users.update).not.toHaveBeenCalled();
  });

  it('rejects a target in another organization', async () => {
    const { uc, users } = makeDeps(makeUser({ organizationId: 99 }));
    await expect(
      uc.execute(makeSession(USER_ROLE.ADMIN), { targetUserId: 'u-2', status: USER_STATUS.SUSPENDED }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('refuses to change the actor own status', async () => {
    const self = makeUser({ id: 'admin-1' });
    const { uc, users } = makeDeps(self);
    await expect(
      uc.execute(makeSession(USER_ROLE.ADMIN, 'admin-1'), {
        targetUserId: 'admin-1',
        status: USER_STATUS.SUSPENDED,
      }),
    ).rejects.toThrow('No puedes cambiar tu propio estado');
    expect(users.update).not.toHaveBeenCalled();
  });

  it('is a no-op when the status already matches', async () => {
    const { uc, users } = makeDeps(makeUser({ status: USER_STATUS.SUSPENDED }));
    await uc.execute(makeSession(USER_ROLE.ADMIN), {
      targetUserId: 'u-2',
      status: USER_STATUS.SUSPENDED,
    });
    expect(users.update).not.toHaveBeenCalled();
  });

  it('suspends an active teammate in the same org', async () => {
    const { uc, users } = makeDeps(makeUser({ status: USER_STATUS.ACTIVE }));
    await uc.execute(makeSession(USER_ROLE.ADMIN), {
      targetUserId: 'u-2',
      status: USER_STATUS.SUSPENDED,
    });
    expect(users.update).toHaveBeenCalledWith('u-2', { status: USER_STATUS.SUSPENDED });
  });

  it('reactivates a suspended teammate', async () => {
    const { uc, users } = makeDeps(makeUser({ status: USER_STATUS.SUSPENDED }));
    await uc.execute(makeSession(USER_ROLE.ADMIN), {
      targetUserId: 'u-2',
      status: USER_STATUS.ACTIVE,
    });
    expect(users.update).toHaveBeenCalledWith('u-2', { status: USER_STATUS.ACTIVE });
  });
});

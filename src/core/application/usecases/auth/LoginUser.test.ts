import { describe, it, expect, vi } from 'vitest';
import { LoginUser } from './LoginUser';
import { AccountSuspendedError, InvalidCredentialsError } from '@/core/domain/errors/AuthErrors';
import { USER_ROLE, USER_STATUS } from '@/core/domain/constants/UserConstants';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { HashService } from '@/core/application/ports/HashService';
import type { SessionService } from '@/core/application/ports/SessionService';
import type { User } from '@/core/domain/entities/User';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    organizationId: 42,
    username: 'owner',
    email: 'owner@test.cl',
    passwordHash: 'hashed',
    role: USER_ROLE.ADMIN,
    status: USER_STATUS.ACTIVE,
    fullName: undefined,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeDeps(opts: { user?: User; passwordValid?: boolean }) {
  const users = {
    findById: vi.fn(),
    findByEmail: vi.fn().mockResolvedValue(opts.user),
    findByUsername: vi.fn().mockResolvedValue(opts.user),
    findByOrganization: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } satisfies UserRepository;

  const hash = {
    hash: vi.fn(),
    compare: vi.fn().mockResolvedValue(opts.passwordValid ?? true),
  } satisfies HashService;

  const session = {
    sign: vi.fn().mockResolvedValue('signed-token'),
  } as unknown as SessionService;

  const uc = new LoginUser({ users, hash, session });
  return { uc, users, hash, session };
}

const input = { identifier: 'owner@test.cl', password: 'supersecret' };

describe('LoginUser', () => {
  it('issues a token for an active user with valid credentials', async () => {
    const { uc, session } = makeDeps({ user: makeUser(), passwordValid: true });

    const out = await uc.execute(input);

    expect(out.token).toBe('signed-token');
    expect(out.session.userId).toBe('1');
    expect(session.sign).toHaveBeenCalledTimes(1);
  });

  it('blocks a suspended user even with valid credentials', async () => {
    const { uc, session } = makeDeps({
      user: makeUser({ status: USER_STATUS.SUSPENDED }),
      passwordValid: true,
    });

    await expect(uc.execute(input)).rejects.toBeInstanceOf(AccountSuspendedError);
    // No session is minted for a suspended account.
    expect(session.sign).not.toHaveBeenCalled();
  });

  it('rejects an invalid password before checking status', async () => {
    const { uc } = makeDeps({
      user: makeUser({ status: USER_STATUS.SUSPENDED }),
      passwordValid: false,
    });
    // Wrong password → generic InvalidCredentials, not the suspended message.
    await expect(uc.execute(input)).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('rejects an unknown user', async () => {
    const { uc } = makeDeps({ user: undefined });
    await expect(uc.execute(input)).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

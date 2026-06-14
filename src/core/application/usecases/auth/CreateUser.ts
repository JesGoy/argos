import type { HashService } from '@/core/application/ports/HashService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { SessionData } from '@/core/application/ports/SessionService';
import type { EnforcePlanLimit } from '@/core/application/usecases/billing/EnforcePlanLimit';
import type { GetSubscription } from '@/core/application/usecases/billing/GetSubscription';
import type { User } from '@/core/domain/entities/User';
import { USER_ROLE, USER_ROLES, type UserRole } from '@/core/domain/constants/UserConstants';
import { DuplicateUserError, UnauthorizedError } from '@/core/domain/errors/AuthErrors';

export interface CreateUserDeps {
  users: UserRepository;
  hash: HashService;
  getSubscription: GetSubscription;
  enforcePlanLimit: EnforcePlanLimit;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  fullName?: string;
}

/**
 * Use Case: CreateUser
 * Admin-only: add a teammate to the actor's own organization. This is the only
 * "join an existing org" path in the app (public signup always spins up a fresh
 * one-user org), so it is where the plan's `users` cap is enforced: the cap is
 * checked BEFORE creating, against the current member count, so a Free org
 * (cap 1) cannot add a second user. Tenant-scoped — the new user always
 * inherits `actor.organizationId`; the org is never taken from input.
 */
export class CreateUser {
  constructor(private readonly deps: CreateUserDeps) {}

  async execute(actor: SessionData, input: CreateUserInput): Promise<User> {
    if (actor.role !== USER_ROLE.ADMIN) {
      throw new UnauthorizedError('Solo administradores pueden crear usuarios');
    }
    if (!USER_ROLES.includes(input.role)) {
      throw new Error('Rol inválido');
    }

    // Enforce the plan's user cap first so an org at its limit gets the upgrade
    // CTA regardless of any other validation error.
    const subscription = await this.deps.getSubscription.execute(actor.organizationId);
    const existing = await this.deps.users.findByOrganization(actor.organizationId);
    this.deps.enforcePlanLimit.execute({
      plan: subscription.plan,
      limitType: 'users',
      current: existing.length,
    });

    await this.ensureUnique(input);

    const passwordHash = await this.deps.hash.hash(input.password);

    return this.deps.users.create({
      organizationId: actor.organizationId,
      username: input.username,
      email: input.email,
      passwordHash,
      role: input.role,
      fullName: input.fullName,
    });
  }

  private async ensureUnique(input: CreateUserInput) {
    const [byEmail, byUsername] = await Promise.all([
      this.deps.users.findByEmail(input.email),
      this.deps.users.findByUsername(input.username),
    ]);

    if (byEmail) {
      throw new DuplicateUserError('email');
    }
    if (byUsername) {
      throw new DuplicateUserError('username');
    }
  }
}

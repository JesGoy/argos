import type { HashService } from '@/core/application/ports/HashService';
import type { UserRepository } from '@/core/application/ports/UserRepository';
import type { OrganizationRepository } from '@/core/application/ports/OrganizationRepository';
import type { SessionData, SessionService } from '@/core/application/ports/SessionService';
import type { EnsureSubscription } from '@/core/application/usecases/billing/EnsureSubscription';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { DuplicateUserError } from '@/core/domain/errors/AuthErrors';

export interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  organizationName?: string;
}

export interface RegisterUserOutput {
  token: string;
  session: SessionData;
}

/**
 * Use Case: RegisterUser
 * Public self-registration: creates a new organization (tenant) and its owner
 * user (role admin), then returns a signed session token. The role is never
 * taken from client input — the signup owner is always admin of their own org.
 */
export class RegisterUser {
  constructor(
    private readonly deps: {
      users: UserRepository;
      organizations: OrganizationRepository;
      hash: HashService;
      session: SessionService;
      ensureSubscription: EnsureSubscription;
    }
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    await this.ensureUnique(input);

    const passwordHash = await this.deps.hash.hash(input.password);

    const organization = await this.deps.organizations.create({
      name: input.organizationName?.trim() || `Negocio de ${input.username}`,
    });

    await this.deps.ensureSubscription.execute(Number(organization.id));

    const user = await this.deps.users.create({
      organizationId: Number(organization.id),
      username: input.username,
      email: input.email,
      passwordHash,
      role: USER_ROLE.ADMIN,
      fullName: input.fullName,
    });

    const session: SessionData = {
      userId: user.id,
      organizationId: user.organizationId,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = await this.deps.session.sign(session);
    return { token, session };
  }

  private async ensureUnique(input: RegisterUserInput) {
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

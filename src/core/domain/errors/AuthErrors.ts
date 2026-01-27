/**
 * Domain Error: Invalid credentials
 */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credenciales inválidas');
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Domain Error: User not found
 */
export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Usuario no encontrado: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Domain Error: Duplicate user (email or username)
 */
export class DuplicateUserError extends Error {
  constructor(field: 'email' | 'username') {
    super(`Ya existe un usuario con ese ${field}`);
    this.name = 'DuplicateUserError';
  }
}

/**
 * Domain Error: Unauthorized action based on role
 */
export class UnauthorizedError extends Error {
  constructor(message = 'No autorizado para realizar esta acción') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Password reset specific errors
 */
export class PasswordResetNotFoundError extends Error {
  constructor() {
    super('Código de recuperación inválido');
    this.name = 'PasswordResetNotFoundError';
  }
}

export class PasswordResetExpiredError extends Error {
  constructor() {
    super('Código de recuperación expirado');
    this.name = 'PasswordResetExpiredError';
  }
}

export class PasswordResetUsedError extends Error {
  constructor() {
    super('Código de recuperación ya utilizado');
    this.name = 'PasswordResetUsedError';
  }
}

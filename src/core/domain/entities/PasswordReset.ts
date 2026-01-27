export interface PasswordReset {
  id: string;
  userId: string;
  pin: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface CreatePasswordResetInput {
  userId: string;
  pin: string;
  expiresAt: Date;
}

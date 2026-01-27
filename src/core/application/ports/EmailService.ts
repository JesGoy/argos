export interface EmailService {
  sendPasswordReset(email: string, pin: string): Promise<void>;
}

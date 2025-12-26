export type SessionData = {
  userId: string;
  username: string;
  email: string;
  role: 'admin' | 'warehouse_manager' | 'operator' | 'viewer';
};

export interface SessionService {
  sign(payload: SessionData): Promise<string>;
  verify(token: string): Promise<SessionData>;
}

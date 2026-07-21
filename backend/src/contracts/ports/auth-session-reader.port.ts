export interface IAuthSession {
  user: {
    id: string;
    username: string;
    isSuperAdmin: boolean;
    isActive: boolean;
    authorizationVersion?: number;
  };
  employee: {
    id: string;
    departmentId: string | null;
  } | null;
}

export interface IAuthSessionReader {
  loadAuthSession(userId: string): Promise<IAuthSession | null>;
  isAuthUserActive(userId: string): Promise<boolean>;
}

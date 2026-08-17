export type Role = 'DEV' | 'ENCARGADO' | 'BARBERO';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

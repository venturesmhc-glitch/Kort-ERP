import type { Role } from '../auth/auth.types';

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  dni?: string;
  phone?: string;
  address?: string;
  active: boolean;
}

export type UserInput = Omit<AppUser, 'id'>;

export interface PublicBarbero {
  id: string;
  firstName: string;
  lastName: string;
}

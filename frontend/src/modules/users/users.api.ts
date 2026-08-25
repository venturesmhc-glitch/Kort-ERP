import { apiRequest } from '../../lib/apiClient';
import type { AppUser, PublicBarbero, UserInput } from './users.types';

export function listUsersRequest(): Promise<AppUser[]> {
  return apiRequest<AppUser[]>('/users');
}

export function createUserRequest(input: UserInput): Promise<AppUser> {
  return apiRequest<AppUser>('/users', { method: 'POST', body: input });
}

export function updateUserRequest(id: string, input: UserInput): Promise<AppUser> {
  return apiRequest<AppUser>(`/users/${id}`, { method: 'PUT', body: input });
}

export function deleteUserRequest(id: string): Promise<void> {
  return apiRequest<void>(`/users/${id}`, { method: 'DELETE' });
}

// Barberos activos para el panel admin (ej. HorarioForm) - incluye tanto a
// los de rol Barbero como a Encargados/Dev marcados como "tambien atiende
// turnos" (ver UserForm.tsx).
export function listBarberosRequest(): Promise<AppUser[]> {
  return apiRequest<AppUser[]>('/users?esBarbero=true&active=true');
}

// Version publica (sin auth) para el wizard de turnos de la landing.
export function listPublicBarberosRequest(): Promise<PublicBarbero[]> {
  return apiRequest<PublicBarbero[]>('/public/barberos', { auth: false });
}

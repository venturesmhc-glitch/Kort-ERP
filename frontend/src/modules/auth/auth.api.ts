import { apiRequest } from '../../lib/apiClient';
import type { LoginResponse } from './auth.types';

export function loginRequest(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export function logoutRequest() {
  return apiRequest<void>('/auth/logout', { method: 'POST' });
}

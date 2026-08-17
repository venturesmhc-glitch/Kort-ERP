import { apiRequest } from '../../lib/apiClient';
import type { Client, ClientInput } from './clients.types';

export function listClientsRequest() {
  return apiRequest<Client[]>('/clients');
}

export function createClientRequest(input: ClientInput) {
  return apiRequest<Client>('/clients', { method: 'POST', body: input });
}

export function updateClientRequest(id: string, input: ClientInput) {
  return apiRequest<Client>(`/clients/${id}`, { method: 'PUT', body: input });
}

export function deleteClientRequest(id: string) {
  return apiRequest<void>(`/clients/${id}`, { method: 'DELETE' });
}

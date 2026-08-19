import { apiRequest } from '../../lib/apiClient';
import type { Client, ClientInput } from './clients.types';

// El backend pagina (ver backend/src/utils/pagination.ts), pero los 3
// consumidores de esta funcion (ClientsPage, y los selectores de cliente de
// CorteForm/VentaForm) todavia esperan "la lista completa" - se desenvuelve
// items aca para no tener que tocarlos a todos.
export async function listClientsRequest(): Promise<Client[]> {
  const { items } = await apiRequest<{ items: Client[] }>('/clients');
  return items;
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

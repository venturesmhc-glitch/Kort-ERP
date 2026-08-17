import { apiRequest } from '../../lib/apiClient';
import type { Jornada } from './jornadas.types';

export interface ListJornadasFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
}

export function listJornadasRequest(filtros: ListJornadasFiltros = {}): Promise<Jornada[]> {
  const params = new URLSearchParams();
  if (filtros.fechaDesde) params.set('dateFrom', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('dateTo', filtros.fechaHasta);
  const query = params.toString();
  return apiRequest<Jornada[]>(`/workshifts${query ? `?${query}` : ''}`);
}

import { apiRequest } from '../../lib/apiClient';
import type { CommissionRow } from './comisiones.types';

export interface ListComisionesFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
}

export function listComisionesRequest(filtros: ListComisionesFiltros = {}): Promise<CommissionRow[]> {
  const params = new URLSearchParams();
  if (filtros.fechaDesde) params.set('dateFrom', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('dateTo', filtros.fechaHasta);
  const query = params.toString();
  return apiRequest<CommissionRow[]>(`/commissions${query ? `?${query}` : ''}`);
}

import { apiRequest } from '../../lib/apiClient';
import type { BarberStat, ClientStats, CutStats, SaleStats } from './estadisticas.types';

export interface StatsFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
}

function buildQuery(filtros: StatsFiltros) {
  const params = new URLSearchParams();
  if (filtros.fechaDesde) params.set('dateFrom', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('dateTo', filtros.fechaHasta);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getClientStatsRequest(filtros: StatsFiltros = {}): Promise<ClientStats> {
  return apiRequest<ClientStats>(`/stats/clients${buildQuery(filtros)}`);
}

export function getBarberStatsRequest(filtros: StatsFiltros = {}): Promise<BarberStat[]> {
  return apiRequest<BarberStat[]>(`/stats/barbers${buildQuery(filtros)}`);
}

export function getCutStatsRequest(filtros: StatsFiltros = {}): Promise<CutStats> {
  return apiRequest<CutStats>(`/stats/cuts${buildQuery(filtros)}`);
}

export function getSaleStatsRequest(filtros: StatsFiltros = {}): Promise<SaleStats> {
  return apiRequest<SaleStats>(`/stats/sales${buildQuery(filtros)}`);
}

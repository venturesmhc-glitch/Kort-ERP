import { apiDownload, apiRequest } from '../../lib/apiClient';
import type { StockReportFilters, StockReportRow } from './reports.types';

interface StockReportDto {
  id: string;
  name: string;
  tipoProducto: { id: string; name: string };
  stock: number;
  stockMinimo: number | null;
  stockCritico: number | null;
  price: number;
  nivelStock: 'ok' | 'bajo' | 'critico';
}

function buildStockQuery(filters?: StockReportFilters) {
  const params = new URLSearchParams();
  if (filters?.tipoProductoId) params.set('tipoProductoId', filters.tipoProductoId);
  if (filters?.estado) params.set('estado', filters.estado);
  return params;
}

export async function getStockReportRequest(filters?: StockReportFilters): Promise<StockReportRow[]> {
  const query = buildStockQuery(filters).toString();
  const dtos = await apiRequest<StockReportDto[]>(`/reports/stock${query ? `?${query}` : ''}`);
  return dtos.map((dto) => ({
    id: dto.id,
    nombre: dto.name,
    categoriaNombre: dto.tipoProducto.name,
    stock: dto.stock,
    stockMinimo: dto.stockMinimo,
    stockCritico: dto.stockCritico,
    precio: dto.price,
    nivel: dto.nivelStock,
  }));
}

export function exportStockReportRequest(filters: StockReportFilters | undefined, format: 'xlsx' | 'pdf') {
  const query = buildStockQuery(filters);
  query.set('format', format);
  return apiDownload(`/reports/stock/export?${query.toString()}`, `listado-stock.${format}`);
}

export function exportContableReportRequest(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  return apiDownload(`/reports/contable/export?${params.toString()}`, 'reporte-contable.xlsx');
}

export function exportVentasCortesReportRequest(dateFrom?: string, dateTo?: string, barberoId?: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (barberoId) params.set('barberoId', barberoId);
  return apiDownload(`/reports/ventas-cortes/export?${params.toString()}`, 'ventas-y-cortes.pdf');
}

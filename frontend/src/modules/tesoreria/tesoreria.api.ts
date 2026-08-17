import { apiRequest } from '../../lib/apiClient';
import type { Movimiento, MovimientoSource, MovimientoTipoUI } from './tesoreria.types';
import type { MovimientoFormValues } from './tesoreria.schema';

interface EntryDto {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  expenseKind: 'FIXED' | 'VARIABLE' | null;
  categoryId: string;
  category: { id: string; name: string };
  amount: number;
  description: string | null;
  entryDate: string;
  source: MovimientoSource;
}

function toTipoUI(dto: EntryDto): MovimientoTipoUI {
  if (dto.type === 'INCOME') return 'ingreso';
  return dto.expenseKind === 'FIXED' ? 'costo_fijo' : 'costo_variable';
}

function fromTipoUI(tipo: MovimientoTipoUI) {
  if (tipo === 'ingreso') {
    return { type: 'INCOME' as const, expenseKind: undefined };
  }
  return {
    type: 'EXPENSE' as const,
    expenseKind: tipo === 'costo_fijo' ? ('FIXED' as const) : ('VARIABLE' as const),
  };
}

function toMovimiento(dto: EntryDto): Movimiento {
  return {
    id: dto.id,
    tipoUI: toTipoUI(dto),
    categoriaId: dto.categoryId,
    categoriaNombre: dto.category.name,
    monto: dto.amount,
    fecha: dto.entryDate,
    descripcion: dto.description ?? undefined,
    source: dto.source,
  };
}

export interface ListMovimientosFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
  tipo?: MovimientoTipoUI;
  categoriaId?: string;
}

export async function listMovimientosRequest(filtros: ListMovimientosFiltros = {}): Promise<Movimiento[]> {
  const params = new URLSearchParams();
  if (filtros.fechaDesde) params.set('dateFrom', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('dateTo', filtros.fechaHasta);
  if (filtros.categoriaId) params.set('categoryId', filtros.categoriaId);
  if (filtros.tipo) {
    params.set('type', fromTipoUI(filtros.tipo).type);
  }
  const query = params.toString();
  const dtos = await apiRequest<EntryDto[]>(`/treasury/entries${query ? `?${query}` : ''}`);
  return dtos.map(toMovimiento);
}

export async function createMovimientoRequest(input: MovimientoFormValues): Promise<Movimiento> {
  const { type, expenseKind } = fromTipoUI(input.tipo);
  const dto = await apiRequest<EntryDto>('/treasury/entries', {
    method: 'POST',
    body: {
      type,
      expenseKind,
      categoryId: input.categoriaId,
      amount: input.monto,
      description: input.descripcion || undefined,
      entryDate: input.fecha,
    },
  });
  return toMovimiento(dto);
}

export function deleteMovimientoRequest(id: string): Promise<void> {
  return apiRequest<void>(`/treasury/entries/${id}`, { method: 'DELETE' });
}

export interface TreasurySummary {
  from: string;
  to: string;
  totals: {
    income: number;
    fixedCosts: number;
    variableCosts: number;
    totalCosts: number;
    result: number;
  };
  breakeven: {
    contributionMarginRatio: number | null;
    breakevenRevenue: number | null;
    reachedAt: string | null;
  };
  categoryBreakdown: { categoryId: string; categoryName: string; type: 'INCOME' | 'EXPENSE'; total: number }[];
  series: { date: string; cumulativeIncome: number; cumulativeCosts: number }[];
}

export interface SummaryFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
}

export function getResumenRequest(filtros: SummaryFiltros = {}): Promise<TreasurySummary> {
  const params = new URLSearchParams();
  if (filtros.fechaDesde) params.set('dateFrom', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('dateTo', filtros.fechaHasta);
  const query = params.toString();
  return apiRequest<TreasurySummary>(`/treasury/summary${query ? `?${query}` : ''}`);
}

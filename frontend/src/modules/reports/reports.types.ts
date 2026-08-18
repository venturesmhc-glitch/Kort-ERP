import type { NivelStock } from '../articulos/articulos.types';

export interface StockReportRow {
  id: string;
  nombre: string;
  categoriaNombre: string;
  stock: number;
  stockMinimo: number | null;
  stockCritico: number | null;
  precio: number;
  nivel: NivelStock;
}

export interface StockReportFilters {
  tipoProductoId?: string;
  estado?: NivelStock;
}

export type MovimientoTipoUI = 'costo_fijo' | 'costo_variable' | 'ingreso';
export type MovimientoSource = 'MANUAL' | 'CUT' | 'SALE';

export interface Movimiento {
  id: string;
  tipoUI: MovimientoTipoUI;
  categoriaId: string;
  categoriaNombre: string;
  monto: number;
  fecha: string;
  descripcion?: string;
  source: MovimientoSource;
}

export const MOVIMIENTO_TIPO_LABELS: Record<MovimientoTipoUI, string> = {
  costo_fijo: 'Costo fijo',
  costo_variable: 'Costo variable',
  ingreso: 'Ingreso',
};

export const MOVIMIENTO_SOURCE_LABELS: Record<MovimientoSource, string> = {
  MANUAL: 'Manual',
  CUT: 'Corte',
  SALE: 'Venta',
};

export type MovimientoTipo = 'costo_fijo' | 'costo_variable' | 'ingreso';

export interface Movimiento {
  id: string;
  tipo: MovimientoTipo;
  categoriaId: string;
  categoriaNombre: string;
  monto: number;
  fecha: string;
  descripcion?: string;
}

export type MovimientoInput = Omit<Movimiento, 'id'>;

export const MOVIMIENTO_TIPO_LABELS: Record<MovimientoTipo, string> = {
  costo_fijo: 'Costo fijo',
  costo_variable: 'Costo variable',
  ingreso: 'Ingreso',
};

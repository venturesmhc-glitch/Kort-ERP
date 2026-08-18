export interface Articulo {
  id: string;
  nombre: string;
  descripcion?: string;
  tipoProductoId: string;
  tipoProductoNombre: string;
  precio: number;
  stock: number;
  stockMinimo?: number;
  stockCritico?: number;
  imagenUrl?: string;
}

export type NivelStock = 'ok' | 'bajo' | 'critico';

// Compartido entre el listado de Articulos, el widget de alertas del
// Dashboard y el badge de la barra lateral (ver Plan Integral #1).
export function nivelStock(articulo: Pick<Articulo, 'stock' | 'stockMinimo' | 'stockCritico'>): NivelStock {
  if (articulo.stockCritico !== undefined && articulo.stock <= articulo.stockCritico) {
    return 'critico';
  }
  if (articulo.stockMinimo !== undefined && articulo.stock <= articulo.stockMinimo) {
    return 'bajo';
  }
  return 'ok';
}

export type MovimientoTipo = 'ingreso' | 'egreso';

export interface MovimientoStock {
  id: string;
  tipo: MovimientoTipo;
  cantidad: number;
  motivo?: string;
  fecha: string;
}

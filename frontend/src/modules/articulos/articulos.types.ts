export interface Articulo {
  id: string;
  nombre: string;
  descripcion?: string;
  tipoProductoId: string;
  tipoProductoNombre: string;
  precio: number;
  stock: number;
  umbralStockBajo?: number;
  imagenUrl?: string;
}

export type MovimientoTipo = 'ingreso' | 'egreso';

export interface MovimientoStock {
  id: string;
  tipo: MovimientoTipo;
  cantidad: number;
  motivo?: string;
  fecha: string;
}

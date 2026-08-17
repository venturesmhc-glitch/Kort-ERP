export interface Articulo {
  id: string;
  nombre: string;
  tipoProductoId: string;
  tipoProductoNombre: string;
  precio: number;
  stock: number;
  imagenUrl?: string;
}

export type ArticuloInput = Omit<Articulo, 'id'>;

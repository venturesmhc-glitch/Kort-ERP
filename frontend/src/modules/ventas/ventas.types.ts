export interface VentaItem {
  id: string;
  articuloId: string;
  articuloNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  clienteId?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  vendedorNombre?: string;
  items: VentaItem[];
  total: number;
  fecha: string;
}

export type OrdenCompraEstado = 'BORRADOR' | 'CONFIRMADA' | 'ENVIADA' | 'RECIBIDA';

export interface OrdenCompraItem {
  id: string;
  articleId: string;
  articleNombre: string;
  articleStock: number;
  cantidad: number;
  precioUnitario: number;
}

export interface OrdenCompra {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  estado: OrdenCompraEstado;
  total: number;
  fechaConfirmacion?: string;
  fechaEnvio?: string;
  fechaRecepcion?: string;
  createdAt: string;
  items: OrdenCompraItem[];
}

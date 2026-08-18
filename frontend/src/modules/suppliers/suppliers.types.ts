export interface SupplierProduct {
  id: string;
  articleId: string;
  articleNombre: string;
  precioCosto: number;
  tiempoEntregaDias?: number;
  esPreferido: boolean;
}

export interface Supplier {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  condicionesPago?: string;
  productos: SupplierProduct[];
}

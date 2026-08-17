export type CatalogKey =
  | 'tipos-corte'
  | 'tipos-producto'
  | 'categorias-costos'
  | 'categorias-ingresos';

export interface CatalogItem {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export type CatalogInput = Omit<CatalogItem, 'id'>;

export const CATALOG_LABELS: Record<CatalogKey, string> = {
  'tipos-corte': 'Tipos de corte',
  'tipos-producto': 'Tipos de producto',
  'categorias-costos': 'Categorias de costos',
  'categorias-ingresos': 'Categorias de ingresos',
};

export const CATALOG_KEYS: CatalogKey[] = [
  'tipos-corte',
  'tipos-producto',
  'categorias-costos',
  'categorias-ingresos',
];

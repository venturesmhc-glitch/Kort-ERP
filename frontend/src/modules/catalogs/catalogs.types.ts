export type CatalogKey = string;

export interface CatalogCategory {
  id: string;
  key: CatalogKey;
  name: string;
  description?: string | null;
  isSystem: boolean;
}

export type CatalogCategoryInput = { key: string; name: string; description?: string };

export interface CatalogItem {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  // Solo lo usan los items de la categoria "tipos-corte" (ver modulo Cortes).
  precio?: number;
}

export type CatalogInput = Omit<CatalogItem, 'id'>;

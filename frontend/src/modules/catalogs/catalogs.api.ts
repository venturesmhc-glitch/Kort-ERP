import { createMockCollection } from '../../lib/mockStore';
import type { CatalogInput, CatalogItem, CatalogKey } from './catalogs.types';

const CATALOG_SEEDS: Record<CatalogKey, CatalogItem[]> = {
  'tipos-corte': [
    { id: 'corte-clasico', nombre: 'Corte clasico', activo: true },
    { id: 'corte-fade', nombre: 'Fade', activo: true },
    { id: 'corte-diseno', nombre: 'Diseno', activo: true },
    { id: 'corte-barba', nombre: 'Barba', activo: true },
    { id: 'corte-combo', nombre: 'Combo corte + barba', activo: true },
  ],
  'tipos-producto': [
    { id: 'prod-cosmetica', nombre: 'Cosmetica', activo: true },
    { id: 'prod-indumentaria', nombre: 'Indumentaria', activo: true },
    { id: 'prod-accesorios', nombre: 'Accesorios', activo: true },
  ],
  'categorias-costos': [
    { id: 'costo-alquiler', nombre: 'Alquiler', descripcion: 'Costo fijo', activo: true },
    { id: 'costo-insumos', nombre: 'Insumos', descripcion: 'Costo variable', activo: true },
    { id: 'costo-servicios', nombre: 'Servicios (luz, agua, internet)', activo: true },
    { id: 'costo-sueldos', nombre: 'Sueldos', descripcion: 'Costo fijo', activo: true },
  ],
  'categorias-ingresos': [
    { id: 'ingreso-cortes', nombre: 'Cortes', activo: true },
    { id: 'ingreso-merchandising', nombre: 'Ventas merchandising', activo: true },
    { id: 'ingreso-otros', nombre: 'Otros', activo: true },
  ],
};

const collections = new Map<CatalogKey, ReturnType<typeof createMockCollection<CatalogItem>>>();

function getCollection(key: CatalogKey) {
  let collection = collections.get(key);
  if (!collection) {
    collection = createMockCollection<CatalogItem>(`catalog-${key}`, CATALOG_SEEDS[key]);
    collections.set(key, collection);
  }
  return collection;
}

export function listCatalogItemsRequest(key: CatalogKey): Promise<CatalogItem[]> {
  return getCollection(key).list();
}

export function createCatalogItemRequest(key: CatalogKey, input: CatalogInput) {
  return getCollection(key).create(input);
}

export function updateCatalogItemRequest(key: CatalogKey, id: string, input: CatalogInput) {
  return getCollection(key).update(id, input);
}

export function deleteCatalogItemRequest(key: CatalogKey, id: string) {
  return getCollection(key).remove(id);
}

export async function listActiveCatalogItemsRequest(key: CatalogKey): Promise<CatalogItem[]> {
  const items = await getCollection(key).list();
  return items.filter((item) => item.activo);
}

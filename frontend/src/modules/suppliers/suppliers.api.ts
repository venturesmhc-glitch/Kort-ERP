import { apiRequest } from '../../lib/apiClient';
import type { Supplier } from './suppliers.types';
import type { SupplierFormValues, SupplierProductFormValues } from './suppliers.schema';

export interface ArticleCatalogItem {
  id: string;
  name: string;
  stock: number;
  stockMinimo: number | null;
}

// Catalogo propio del Plan Integral (no /api/articles: ese esta restringido
// a Dev/Encargado y Proveedores/Ordenes de compra son accesibles a los 3
// roles, ver suppliers.routes.ts en el backend).
export function listArticlesCatalogRequest(): Promise<ArticleCatalogItem[]> {
  return apiRequest<ArticleCatalogItem[]>('/suppliers/articles-catalog');
}

interface SupplierProductDto {
  id: string;
  articleId: string;
  article: { id: string; name: string };
  precioCosto: number;
  tiempoEntregaDias: number | null;
  esPreferido: boolean;
}

interface SupplierDto {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  condicionesPago: string | null;
  productos: SupplierProductDto[];
}

function toSupplier(dto: SupplierDto): Supplier {
  return {
    id: dto.id,
    nombre: dto.nombre,
    contacto: dto.contacto ?? undefined,
    telefono: dto.telefono ?? undefined,
    email: dto.email ?? undefined,
    condicionesPago: dto.condicionesPago ?? undefined,
    productos: dto.productos.map((p) => ({
      id: p.id,
      articleId: p.articleId,
      articleNombre: p.article.name,
      precioCosto: p.precioCosto,
      tiempoEntregaDias: p.tiempoEntregaDias ?? undefined,
      esPreferido: p.esPreferido,
    })),
  };
}

export async function listSuppliersRequest(): Promise<Supplier[]> {
  const dtos = await apiRequest<SupplierDto[]>('/suppliers');
  return dtos.map(toSupplier);
}

export async function createSupplierRequest(input: SupplierFormValues): Promise<Supplier> {
  const dto = await apiRequest<SupplierDto>('/suppliers', { method: 'POST', body: input });
  return toSupplier(dto);
}

export async function updateSupplierRequest(id: string, input: SupplierFormValues): Promise<Supplier> {
  const dto = await apiRequest<SupplierDto>(`/suppliers/${id}`, { method: 'PUT', body: input });
  return toSupplier(dto);
}

export function deleteSupplierRequest(id: string): Promise<void> {
  return apiRequest<void>(`/suppliers/${id}`, { method: 'DELETE' });
}

export async function upsertSupplierProductRequest(
  supplierId: string,
  input: SupplierProductFormValues
): Promise<void> {
  await apiRequest(`/suppliers/${supplierId}/products`, { method: 'POST', body: input });
}

export function removeSupplierProductRequest(supplierId: string, articleId: string): Promise<void> {
  return apiRequest<void>(`/suppliers/${supplierId}/products/${articleId}`, { method: 'DELETE' });
}

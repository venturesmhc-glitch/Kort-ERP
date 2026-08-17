import { apiRequest } from '../../lib/apiClient';
import type { CatalogCategory, CatalogCategoryInput, CatalogInput, CatalogItem, CatalogKey } from './catalogs.types';

interface CategoryDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

interface ItemDto {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

function toCategory(dto: CategoryDto): CatalogCategory {
  return { id: dto.id, key: dto.key, name: dto.name, description: dto.description, isSystem: dto.isSystem };
}

function toItem(dto: ItemDto): CatalogItem {
  return { id: dto.id, nombre: dto.name, descripcion: dto.description ?? undefined, activo: dto.active };
}

function fromInput(input: CatalogInput) {
  return { name: input.nombre, description: input.descripcion, active: input.activo };
}

export async function listCategoriesRequest(): Promise<CatalogCategory[]> {
  const dtos = await apiRequest<CategoryDto[]>('/catalogs');
  return dtos.map(toCategory);
}

export async function createCategoryRequest(input: CatalogCategoryInput): Promise<CatalogCategory> {
  const dto = await apiRequest<CategoryDto>('/catalogs', { method: 'POST', body: input });
  return toCategory(dto);
}

export async function deleteCategoryRequest(key: CatalogKey): Promise<void> {
  return apiRequest<void>(`/catalogs/${key}`, { method: 'DELETE' });
}

export async function listCatalogItemsRequest(key: CatalogKey): Promise<CatalogItem[]> {
  const dtos = await apiRequest<ItemDto[]>(`/catalogs/${key}/items?includeInactive=true`);
  return dtos.map(toItem);
}

export async function createCatalogItemRequest(key: CatalogKey, input: CatalogInput): Promise<CatalogItem> {
  const dto = await apiRequest<ItemDto>(`/catalogs/${key}/items`, { method: 'POST', body: fromInput(input) });
  return toItem(dto);
}

export async function updateCatalogItemRequest(
  key: CatalogKey,
  id: string,
  input: CatalogInput
): Promise<CatalogItem> {
  const dto = await apiRequest<ItemDto>(`/catalogs/${key}/items/${id}`, {
    method: 'PUT',
    body: fromInput(input),
  });
  return toItem(dto);
}

export async function deleteCatalogItemRequest(key: CatalogKey, id: string): Promise<void> {
  return apiRequest<void>(`/catalogs/${key}/items/${id}`, { method: 'DELETE' });
}

export async function listActiveCatalogItemsRequest(key: CatalogKey): Promise<CatalogItem[]> {
  const dtos = await apiRequest<ItemDto[]>(`/catalogs/${key}/items`);
  return dtos.map(toItem);
}

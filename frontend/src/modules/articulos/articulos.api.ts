import { apiRequest, apiUpload } from '../../lib/apiClient';
import type { Articulo, MovimientoStock } from './articulos.types';
import type { ArticuloFormValues, MovimientoFormValues } from './articulos.schema';

interface ArticleDto {
  id: string;
  name: string;
  description: string | null;
  tipoProductoId: string;
  tipoProducto: { id: string; name: string };
  price: number;
  imageUrl: string | null;
  stock: number;
  lowStockThreshold: number | null;
}

interface MovementDto {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string | null;
  createdAt: string;
}

function toArticulo(dto: ArticleDto): Articulo {
  return {
    id: dto.id,
    nombre: dto.name,
    descripcion: dto.description ?? undefined,
    tipoProductoId: dto.tipoProductoId,
    tipoProductoNombre: dto.tipoProducto.name,
    precio: dto.price,
    stock: dto.stock,
    umbralStockBajo: dto.lowStockThreshold ?? undefined,
    imagenUrl: dto.imageUrl ?? undefined,
  };
}

function toMovimiento(dto: MovementDto): MovimientoStock {
  return {
    id: dto.id,
    tipo: dto.type === 'IN' ? 'ingreso' : 'egreso',
    cantidad: dto.quantity,
    motivo: dto.reason ?? undefined,
    fecha: dto.createdAt,
  };
}

// Gestion (Encargado/Dev): listado completo del panel de Articulos y Stock.
export async function listArticulosRequest(): Promise<Articulo[]> {
  const dtos = await apiRequest<ArticleDto[]>('/articles');
  return dtos.map(toArticulo);
}

// Catalogo de lectura publica (sin auth): tienda de la landing y el selector de
// articulo en Ventas (que en el panel admin es accesible a los 3 roles, a
// diferencia de la gestion de Articulos/Stock que es solo Encargado/Dev).
export async function listPublicArticulosRequest(): Promise<Articulo[]> {
  const dtos = await apiRequest<ArticleDto[]>('/public/articles', { auth: false });
  return dtos.map(toArticulo);
}

export async function listStockBajoRequest(): Promise<Articulo[]> {
  const dtos = await apiRequest<ArticleDto[]>('/articles/low-stock');
  return dtos.map(toArticulo);
}

export async function createArticuloRequest(input: ArticuloFormValues): Promise<Articulo> {
  const dto = await apiRequest<ArticleDto>('/articles', {
    method: 'POST',
    body: {
      name: input.nombre,
      description: input.descripcion || undefined,
      tipoProductoId: input.tipoProductoId,
      price: input.precio,
      lowStockThreshold: input.umbralStockBajo,
      stock: input.stockInicial,
    },
  });
  return toArticulo(dto);
}

export async function updateArticuloRequest(id: string, input: ArticuloFormValues): Promise<Articulo> {
  const dto = await apiRequest<ArticleDto>(`/articles/${id}`, {
    method: 'PUT',
    body: {
      name: input.nombre,
      description: input.descripcion || undefined,
      tipoProductoId: input.tipoProductoId,
      price: input.precio,
      lowStockThreshold: input.umbralStockBajo,
    },
  });
  return toArticulo(dto);
}

export function deleteArticuloRequest(id: string): Promise<void> {
  return apiRequest<void>(`/articles/${id}`, { method: 'DELETE' });
}

export async function uploadImagenRequest(articuloId: string, file: File): Promise<Articulo> {
  const formData = new FormData();
  formData.append('image', file);
  const dto = await apiUpload<ArticleDto>(`/articles/${articuloId}/image`, formData);
  return toArticulo(dto);
}

export async function listMovimientosRequest(articuloId: string): Promise<MovimientoStock[]> {
  const dtos = await apiRequest<MovementDto[]>(`/articles/${articuloId}/movements`);
  return dtos.map(toMovimiento);
}

export async function crearMovimientoRequest(
  articuloId: string,
  input: MovimientoFormValues
): Promise<Articulo> {
  const dto = await apiRequest<ArticleDto>(`/articles/${articuloId}/movements`, {
    method: 'POST',
    body: {
      type: input.tipo === 'ingreso' ? 'IN' : 'OUT',
      quantity: input.cantidad,
      reason: input.motivo || undefined,
    },
  });
  return toArticulo(dto);
}

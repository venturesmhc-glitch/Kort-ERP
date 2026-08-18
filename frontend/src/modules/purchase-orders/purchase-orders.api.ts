import { apiRequest } from '../../lib/apiClient';
import type { OrdenCompra, OrdenCompraEstado } from './purchase-orders.types';

interface OrdenCompraDto {
  id: string;
  proveedorId: string;
  proveedor: { id: string; nombre: string };
  estado: OrdenCompraEstado;
  total: number;
  fechaConfirmacion: string | null;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  createdAt: string;
  items: {
    id: string;
    articleId: string;
    article: { id: string; name: string; stock: number };
    cantidad: number;
    precioUnitario: number;
  }[];
}

function toOrdenCompra(dto: OrdenCompraDto): OrdenCompra {
  return {
    id: dto.id,
    proveedorId: dto.proveedorId,
    proveedorNombre: dto.proveedor.nombre,
    estado: dto.estado,
    total: dto.total,
    fechaConfirmacion: dto.fechaConfirmacion ?? undefined,
    fechaEnvio: dto.fechaEnvio ?? undefined,
    fechaRecepcion: dto.fechaRecepcion ?? undefined,
    createdAt: dto.createdAt,
    items: dto.items.map((item) => ({
      id: item.id,
      articleId: item.articleId,
      articleNombre: item.article.name,
      articleStock: item.article.stock,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
    })),
  };
}

export async function listOrdenesCompraRequest(filters?: {
  estado?: OrdenCompraEstado;
  proveedorId?: string;
}): Promise<OrdenCompra[]> {
  const params = new URLSearchParams();
  if (filters?.estado) params.set('estado', filters.estado);
  if (filters?.proveedorId) params.set('proveedorId', filters.proveedorId);
  const query = params.toString();
  const dtos = await apiRequest<OrdenCompraDto[]>(`/purchase-orders${query ? `?${query}` : ''}`);
  return dtos.map(toOrdenCompra);
}

export async function getOrdenCompraRequest(id: string): Promise<OrdenCompra> {
  const dto = await apiRequest<OrdenCompraDto>(`/purchase-orders/${id}`);
  return toOrdenCompra(dto);
}

export async function updateOrdenCompraRequest(
  id: string,
  input: { proveedorId?: string; items: { articleId: string; cantidad: number; precioUnitario: number }[] }
): Promise<OrdenCompra> {
  const dto = await apiRequest<OrdenCompraDto>(`/purchase-orders/${id}`, { method: 'PUT', body: input });
  return toOrdenCompra(dto);
}

export async function confirmOrdenCompraRequest(id: string): Promise<OrdenCompra> {
  const dto = await apiRequest<OrdenCompraDto>(`/purchase-orders/${id}/confirm`, { method: 'POST' });
  return toOrdenCompra(dto);
}

export async function sendOrdenCompraRequest(id: string): Promise<OrdenCompra> {
  const dto = await apiRequest<OrdenCompraDto>(`/purchase-orders/${id}/send`, { method: 'POST' });
  return toOrdenCompra(dto);
}

export async function receiveOrdenCompraRequest(id: string): Promise<OrdenCompra> {
  const dto = await apiRequest<OrdenCompraDto>(`/purchase-orders/${id}/receive`, { method: 'POST' });
  return toOrdenCompra(dto);
}

export function deleteOrdenCompraRequest(id: string): Promise<void> {
  return apiRequest<void>(`/purchase-orders/${id}`, { method: 'DELETE' });
}

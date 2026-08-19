import { apiRequest } from '../../lib/apiClient';
import type { Venta } from './ventas.types';
import type { ClienteVentaFormValues } from './ventas.schema';

interface SaleItemDto {
  id: string;
  articleId: string;
  article: { id: string; name: string };
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface SaleDto {
  id: string;
  clientId: string | null;
  client: { id: string; firstName: string; lastName: string; phone: string } | null;
  sellerId: string | null;
  seller: { id: string; firstName: string; lastName: string } | null;
  totalAmount: number;
  createdAt: string;
  items: SaleItemDto[];
}

function toVenta(dto: SaleDto): Venta {
  return {
    id: dto.id,
    clienteId: dto.clientId ?? undefined,
    clienteNombre: dto.client ? `${dto.client.firstName} ${dto.client.lastName}` : undefined,
    clienteTelefono: dto.client?.phone,
    vendedorNombre: dto.seller ? `${dto.seller.firstName} ${dto.seller.lastName}` : undefined,
    items: dto.items.map((item) => ({
      id: item.id,
      articuloId: item.articleId,
      articuloNombre: item.article.name,
      cantidad: item.quantity,
      precioUnitario: item.unitPrice,
      subtotal: item.subtotal,
    })),
    total: dto.totalAmount,
    fecha: dto.createdAt,
  };
}

export interface CrearVentaItemInput {
  articuloId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CrearVentaInput {
  items: CrearVentaItemInput[];
  clienteId?: string;
  clienteNuevo?: ClienteVentaFormValues;
  discountCode?: string;
}

export interface ListVentasFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
  articuloId?: string;
}

export async function listVentasRequest(filtros: ListVentasFiltros = {}): Promise<Venta[]> {
  const params = new URLSearchParams();
  if (filtros.fechaDesde) params.set('dateFrom', filtros.fechaDesde);
  if (filtros.fechaHasta) params.set('dateTo', filtros.fechaHasta);
  if (filtros.articuloId) params.set('articleId', filtros.articuloId);
  const query = params.toString();
  const dtos = await apiRequest<SaleDto[]>(`/sales${query ? `?${query}` : ''}`);
  return dtos.map(toVenta);
}

export async function crearVentaRequest(
  input: CrearVentaInput
): Promise<Venta & { treasuryWarning?: string }> {
  const dto = await apiRequest<SaleDto & { treasuryWarning?: string }>('/sales', {
    method: 'POST',
    body: {
      items: input.items.map((item) => ({
        articleId: item.articuloId,
        quantity: item.cantidad,
        unitPrice: item.precioUnitario,
      })),
      clientId: input.clienteId,
      client: input.clienteNuevo,
      discountCode: input.discountCode,
    },
  });
  return { ...toVenta(dto), treasuryWarning: dto.treasuryWarning };
}

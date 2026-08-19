import { apiRequest } from '../../lib/apiClient';

export interface MerchPedidoItem {
  articuloNombre: string;
  cantidad: number;
  subtotal: number;
}

export interface MerchPedido {
  id: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  items: MerchPedidoItem[];
  total: number;
  fecha: string;
}

interface MerchSaleDto {
  id: string;
  totalAmount: number;
  createdAt: string;
  client: { firstName: string; lastName: string; phone: string } | null;
  items: { quantity: number; subtotal: number; article: { name: string } }[];
}

function toMerchPedido(dto: MerchSaleDto): MerchPedido {
  return {
    id: dto.id,
    clienteNombre: dto.client ? `${dto.client.firstName} ${dto.client.lastName}` : undefined,
    clienteTelefono: dto.client?.phone,
    items: dto.items.map((item) => ({
      articuloNombre: item.article.name,
      cantidad: item.quantity,
      subtotal: item.subtotal,
    })),
    total: dto.totalAmount,
    fecha: dto.createdAt,
  };
}

export async function listMerchPendientesRequest(): Promise<MerchPedido[]> {
  const dtos = await apiRequest<MerchSaleDto[]>('/merch/pending');
  return dtos.map(toMerchPedido);
}

export async function marcarMerchEntregadoRequest(id: string): Promise<MerchPedido> {
  const dto = await apiRequest<MerchSaleDto>(`/merch/${id}/status`, {
    method: 'PUT',
    body: { status: 'DELIVERED' },
  });
  return toMerchPedido(dto);
}

export function cancelarMerchPedidoRequest(id: string): Promise<MerchPedido> {
  return apiRequest<MerchSaleDto>(`/merch/${id}/status`, {
    method: 'PUT',
    body: { status: 'CANCELLED' },
  }).then(toMerchPedido);
}

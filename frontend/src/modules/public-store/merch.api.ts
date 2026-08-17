import { apiRequest } from '../../lib/apiClient';
import type { CartItem } from './store.types';

export interface MerchClienteInput {
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
}

interface CheckoutResponseDto {
  id: string;
  totalAmount: number;
}

export async function checkoutMerchRequest(
  items: CartItem[],
  cliente: MerchClienteInput
): Promise<{ saleId: string; total: number }> {
  const dto = await apiRequest<CheckoutResponseDto>('/public/merch/checkout', {
    method: 'POST',
    auth: false,
    body: {
      items: items.map((item) => ({ articleId: item.articuloId, quantity: item.cantidad })),
      client: {
        firstName: cliente.nombre,
        lastName: cliente.apellido,
        phone: cliente.telefono,
        email: cliente.email || undefined,
      },
    },
  });
  return { saleId: dto.id, total: dto.totalAmount };
}

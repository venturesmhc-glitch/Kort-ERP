import { apiRequest } from '../../lib/apiClient';

export interface RedeemedDiscount {
  code: string;
  value: number;
}

export function redeemLoyaltyPointsRequest(clientId: string, points: number): Promise<RedeemedDiscount> {
  return apiRequest<RedeemedDiscount>(`/clients/${clientId}/loyalty/redeem`, {
    method: 'POST',
    body: { points },
  });
}

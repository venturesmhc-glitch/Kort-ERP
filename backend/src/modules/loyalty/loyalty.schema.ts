import { z } from 'zod';

export const redeemLoyaltyPointsSchema = z.object({
  points: z.number().int().min(1, 'Ingresa una cantidad de puntos valida'),
});

export type RedeemLoyaltyPointsInput = z.infer<typeof redeemLoyaltyPointsSchema>;

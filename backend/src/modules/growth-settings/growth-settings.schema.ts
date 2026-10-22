import { z } from 'zod';

export const updateGrowthSettingsSchema = z.object({
  loyaltyEnabled: z.boolean(),
  loyaltyEarnRatio: z.number().int().min(1, 'Tiene que ser mayor a 0'),
  loyaltyRedeemRatio: z.number().int().min(1, 'Tiene que ser mayor a 0'),
  reactivationEnabled: z.boolean(),
  reactivationInactiveDays: z.number().int().min(1, 'Tiene que ser mayor a 0'),
  reactivationCooldownDays: z.number().int().min(1, 'Tiene que ser mayor a 0'),
  reactivationDiscountId: z.string().optional().nullable(),
  reviewRequestEnabled: z.boolean(),
  reviewRequestDelayHours: z.number().int().min(1, 'Tiene que ser mayor a 0'),
  googleReviewUrl: z
    .union([z.string().url('Ingresa una URL valida'), z.literal('')])
    .optional()
    .nullable(),
});

export type UpdateGrowthSettingsInput = z.infer<typeof updateGrowthSettingsSchema>;
